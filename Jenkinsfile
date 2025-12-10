pipeline {

  options {
    disableResume()
    disableConcurrentBuilds abortPrevious: true
  }

  agent any

  tools {
    nodejs 'nodejs-22.6.0'
  }

  environment {
    // public/non-sensitive environment variable
    MONGO_URI = "mongodb+srv://supercluster.d83jj.mongodb.net/superData"

    // credentials moved here
    MONGO_DB_CREDS    = credentials('mongo-db-credentials')
    MONGO_DB_USERNAME = credentials('mongo-db-username')
    MONGO_DB_PASSWORD = credentials('mongo-db-password')
    SONAR_SCANNER_HOME = tool 'sonarqube-scanner-6.10';
    SONAR_SCANNER_OPTS = "-Xmx2048m -Xms512m"
    GITHUB_TOKEN = credentials('github-pat-token')
  }

  stages {

    stage('Check Version') {
      steps {
        sh 'node -v'
        sh 'npm -v'
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm install --no-audit'
      }
    }

    stage('Dependency Scanning') {
      parallel {

        stage('npm-audit') {
          steps {
            sh '''
              npm audit --audit-level=critical || true
            '''
          }
        }

        stage('OWASP-Dependency-Check') {
          steps {
            script {
              dependencyCheck additionalArguments: """
                --scan './'
                --out './dependency-check-report'
                --format 'ALL'
                --prettyPrint
                --noupdate
                --disableKnownExploited
                --disableYarnAudit
              """, odcInstallation: 'OWASP-DepCheck-10'

              dependencyCheckPublisher failedTotalCritical: 10, pattern: 'dependency-check-report/dependency-check-report.xml', stopBuild: true
            }
          }
        }

      } // parallel
    } // Dependency Scanning

    stage('Unit Tests') {
      steps {
        script {
          echo "MONGO_URI: ${env.MONGO_URI}"
          echo "MONGO_DB_USERNAME: ${env.MONGO_DB_USERNAME}"

          sh 'npm test'
        }
      }
    }

    stage('Code Coverage') {
      steps {
        script {
          catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE', message: 'Oops! it will be fixed in future releases') {
            sh 'npm run coverage'
          }
        }
      }
    }

    stage('SAST - Sonarqube') {
      steps {
        timeout(time: 60, unit: 'SECONDS'){
          withSonarQubeEnv('sonarqube-server'){
            sh 'echo $SONAR_SCANNER_HOME'
            sh '''
              $SONAR_SCANNER_HOME/bin/sonar-scanner \
                -Dsonar.projectKey=nodejs_solar-system \
                -Dsonar.sources=app.js \
                -Dsonar.javascript.lcov.reportPaths=./coverage/lcov.info
            '''
          }
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'printenv'
        sh 'docker build -t airist/solar-system:$GIT_COMMIT .'
      }
    }

    stage('Trivy Vulnerability Scan') {
      steps {
        sh '''
           mkdir -p trivy-report

           trivy image airist/solar-system:$GIT_COMMIT \
              --severity LOW,MEDIUM,HIGH \
              --exit-code 0 \
              --quiet \
              --format json -o ./trivy-report/trivy-image-MEDIUM-results.json

           trivy image airist/solar-system:$GIT_COMMIT \
              --severity CRITICAL \
              --exit-code 0 \
              --quiet \
              --format json -o ./trivy-report/trivy-image-CRITICAL-results.json
        '''
      }
     post {
      always {
        sh '''
          mkdir -p trivy-report

          trivy convert \
              --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
              --output ./trivy-report/trivy-image-MEDIUM-results.html ./trivy-report/trivy-image-MEDIUM-results.json

          trivy convert \
              --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
              --output ./trivy-report/trivy-image-CRITICAL-results.html ./trivy-report/trivy-image-CRITICAL-results.json

          trivy convert \
              --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
              --output ./trivy-report/trivy-image-CRITICAL-results.xml ./trivy-report/trivy-image-CRITICAL-results.json
          
          trivy convert \
              --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
              --output ./trivy-report/trivy-image-CRITICAL-results.xml ./trivy-report/trivy-image-CRITICAL-results.json
        '''
      }
     }
    }

    stage('Push Docker Image') {
      steps {
        withDockerRegistry(credentialsId: 'docker-hub-credentials', url: "") {
          sh 'docker push airist/solar-system:$GIT_COMMIT'
        }
      }
    }

    stage('Deploy AWS EC2 Instance') {
      when {
        branch 'feature/*'
      }
      steps {
        script {
          sshagent(['aws-deploy-ec2-key']) {
            sh '''
              ssh -o StrictHostKeyChecking=no ubuntu@98.93.13.86 "\
                if sudo docker ps -a | grep -q 'solar-system'; then \
                  echo 'Container found. Stopping...'; \
                  sudo docker stop solar-system && sudo docker rm solar-system; \
                  echo 'Container stopped and removed.'; \
                fi; \
                sudo docker run --name solar-system \
                  -e MONGO_URI=${MONGO_URI} \
                  -e MONGO_USERNAME=${MONGO_DB_USERNAME} \
                  -e MONGO_PASSWORD=${MONGO_DB_PASSWORD} \
                  -p 3000:3000 -d airist/solar-system:${GIT_COMMIT} \
              "
            '''
          }
        }
      }
    }

    stage('Integration Test - EC2') {
      when {
        branch 'feature/*'
      }
      steps {
        sh 'printenv | grep -i branch'
        withAWS(credentials: 'aws-ec2-lambda-creds', region: 'us-east-1') {
          sh '''
            bash integration-test-ec2.sh
          '''
        }
      }
    }

    stage('Kuberenetes Update Image - Deploy to Staging') {
      when {
        branch 'staging'
      }
      steps {
        sh 'git clone -b main https://github.com/DevSecOps-Jenkins/CO3-solar-system-gitea-deployment.git'
        dir("CO3-solar-system-gitea-deployment/kubernetes") {
          sh '''
              #### Replace Docker Tag ####
              git checkout staging
              sed -i "s#airist.*#airist/solar-system:$GIT_COMMIT#g" deployment.yml 
              cat deployment.yml

              #### Commit and Push to Feature Branch ####
              git config --global user.email "jenkins@dasher.com"
              git remote set-url origin https://$GITHUB_TOKEN@github.com/DevSecOps-Jenkins/CO3-solar-system-gitea-deployment.git 
              git add .
              git commit -am "Updated docker image"
              git push -u origin staging
          '''
        }
      }
    }

    stage('App Deployed') {
      when {
        branch 'staging'
      }
      steps {
        timeout(time: 1, unit: 'DAYS'){
          input message: 'Is the Application:Solar Sytem Deployed?', ok: 'Yes Application Solar System is Deployed.'
        }
      }
    }

    stage('DAST - OWASP ZAP') {
      when {
        branch 'staging'
      }
      steps {
        sh '''
          #### REPLACE below with Kubernetes http://IP_Address: 30000/api-docs/  
          mkdir -p $(pwd)/dast-report
          cd $(pwd)/dast-report
          chmod 777 $(pwd)
          docker run -v $(pwd):/zap/wrk/:rw ghcr.io/zaproxy/zaproxy zap-api-scan.py \
          -t http://192.168.88.25:30000/api-docs \
          -f openapi \
          -r zap_report.html\
          -w zap_report.md \
          -J zap_json_report.json \
          -x zap_xml_report.xml \
          -c ../zap_ignore_rules
        '''
      }
    }

  } // stages

  post {
    always {

      // Delete Folder Deployment
      script {
        if (fileExists('CO3-solar-system-gitea-deployment')){
          sh 'rm -rf CO3-solar-system-gitea-deployment'
        }
      }

      // JUnit test results
      junit allowEmptyResults: true, keepLongStdio: true, testResults: 'test-results/**/*.xml'
      junit allowEmptyResults: true, keepLongStdio: true, testResults: 'dependency-check-report/**/*.xml'

      // HTML Reports
      publishHTML ([
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'dast-report',
        reportFiles: 'zap_report.html',
        reportName: 'DAST - OWASP ZAP Report'
      ])

      // HTML Reports
      publishHTML ([
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'dependency-check-report',
        reportFiles: 'dependency-check-jenkins.html',
        reportName: 'Dependency Check HTML Report'
      ])

      publishHTML ([
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'coverage/lcov-report',
        reportFiles: 'index.html',
        reportName: 'Code Coverage HTML Report'
      ])

      // HTML Reports
      publishHTML ([
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'trivy-report',
        reportFiles: 'trivy-image-MEDIUM-results.html',
        reportName: 'Trivy Image Medium Vul Report'
      ])

      publishHTML ([
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'trivy-report',
        reportFiles: 'trivy-image-CRITICAL-results.html',
        reportName: 'Trivy Image Critical Vul Report'
      ])

      archiveArtifacts artifacts: 'dependency-check-report/**, test-results/**, coverage/lcov-report/**', onlyIfSuccessful: false

      echo 'Build finished — reports published & artifacts archived.'
    }
  }
}

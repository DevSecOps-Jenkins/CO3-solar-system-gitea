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
    SONAR_SCANNER_OPTS= "-Xmx2048m -Xms512m"
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
        sh 'echo $SONAR_SCANNER_HOME'
        sh '''
          $SONAR_SCANNER_HOME/bin/sonar-scanner \
            -Dsonar.projectKey=nodejs_solar-system \
            -Dsonar.sources=app.js \
            -Dsonar.host.url=http://192.168.88.20:9000 \
            -Dsonar.javascript.lcov.reportPaths=./coverage/lcov.info \
            -Dsonar.token=sqp_191cb0cf312f824662d38da73851ae603f041ebf
        '''
      }
    }

  } // stages

  post {
    always {

      // JUnit test results
      junit allowEmptyResults: true, keepLongStdio: true, testResults: 'test-results/**/*.xml'
      junit allowEmptyResults: true, keepLongStdio: true, testResults: 'dependency-check-report/**/*.xml'

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

      archiveArtifacts artifacts: 'dependency-check-report/**, test-results/**, coverage/lcov-report/**', onlyIfSuccessful: false

      echo 'Build finished — reports published & artifacts archived.'
    }
  }
}

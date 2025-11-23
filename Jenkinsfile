pipeline {
  agent any

  tools {
    nodejs 'nodejs-22.6.0'
  }

  environment {
    // public/non-sensitive environment variable
    MONGO_URI = "mongodb+srv://supercluster.d83jj.mongodb.net/superData"
    // Note: username/password will be injected by withCredentials (do NOT put them here)
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
        sh 'echo Installing project dependencies...'
        sh 'npm install --no-audit'
      }
    }

    stage('Dependency Scanning') {
      parallel {
        stage('npm-audit') {
          steps {
            echo 'Running npm audit (report but do not fail pipeline automatically)'
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

              publishHTML ([
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'dependency-check-report',
                reportFiles: 'dependency-check-jenkins.html',
                reportName: 'Dependency Check HTML Report',
                reportTitles: '',
                useWrapperFileDirectly: true
              ])
            }
          }
        } // end OWASP-Dependency-Check
      } // end parallel
    } // end Dependency Scanning

    stage('Unit Tests') {
      steps {
        script {
          // inject username/password from Jenkins Credential store
          withCredentials([usernamePassword(credentialsId: 'mongo-db-credentials', usernameVariable: 'MONGO_USERNAME', passwordVariable: 'MONGO_PASSWORD')]) {
            // show non-sensitive debug info
            echo "MONGO_URI = ${env.MONGO_URI}"
            echo "MONGO_USERNAME = ${env.MONGO_USERNAME}"
            // run unit tests (ensure your tests read MONGO_* env vars)
            sh 'npm test'
            // publish JUnit results (adjust path if your test runner writes elsewhere)
            junit allowEmptyResults: true, keepLongStdio: true, testResults: 'test-results/**/*.xml'
          }
        }
      }
    } // end Unit Tests

  } // end stages

  post {
    always {
      archiveArtifacts artifacts: 'dependency-check-report/**, test-results/**', onlyIfSuccessful: false
      echo 'Build finished - artifacts archived (if any).'
    }
  }
}

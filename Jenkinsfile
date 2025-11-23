pipeline {
  agent any

  tools {
    nodejs 'nodejs-22.6.0'
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
            echo 'Running npm audit (fail on critical)'
            sh '''
              npm audit --audit-level=critical || true
            '''
          }
        }

        stage('OWASP-Dependency-Check') {
          steps {
            script {
              // Quick workaround: no update + disable Known Exploited (avoids CISA 403)
              dependencyCheck additionalArguments: """
                --scan './'
                --out './dependency-check-report'
                --format 'ALL'
                --prettyPrint
                --noupdate
                --disableKnownExploited
              """, odcInstallation: 'OWASP-DepCheck-10'

              // publish (sesuaikan pattern jika output berbeda)
              dependencyCheckPublisher failedTotalCritical: 10, pattern: 'dependency-check-report/dependency-check-report.xml', stopBuild: true
              publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, icon: '', keepAll: true, reportDir: './', reportFiles: 'dependency-check-jenkins.html', reportName: 'Dependency Check HTML Report', reportTitles: '', useWrapperFileDirectly: true])
            }
          }
        }
      }
    }
  }
}

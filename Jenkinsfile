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
              npm audit --audit-level=critical
              echo $?
            '''
          }
        }
        stage('OWASP-Dependency-Check') {
          steps {
            script {
              dependencyCheck additionalArguments: '''
              --scan \'./\'
              --out \'./\'
              --format \'ALL\' 
              --prettyPrint''', odcInstallation: 'OWASP-DepCheck-10'

              dependencyCheckPublisher failedTotalCritical: 1, pattern: 'dependency-check-report.xml', stopBuild: true
            }
          }
        }
      }
    }
  }
}
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
  }
}
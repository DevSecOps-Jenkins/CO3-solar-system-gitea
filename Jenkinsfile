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
  }
}
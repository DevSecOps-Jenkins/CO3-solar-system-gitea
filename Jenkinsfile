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
        // gunakan --no-audit untuk menghindari audit otomatis saat install; kamu bisa remove jika ingin audit real-time
        sh 'npm install --no-audit'
      }
    }

    stage('Dependency Scanning') {
      parallel {
        stage('npm-audit') {
          steps {
            echo 'Running npm audit (report but do not fail pipeline automatically)'
            // jalankan audit, tampilkan output; gunakan || true agar build lanjut (jika ingin fail on critical, hapus || true)
            sh '''
              npm audit --audit-level=critical || true
            '''
          }
        }

        stage('OWASP-Dependency-Check') {
          steps {
            script {
              // Jalankan Dependency-Check CLI via plugin (pastikan tool terdaftar sebagai OWASP-DepCheck-10)
              dependencyCheck additionalArguments: """
                --scan './'
                --out './dependency-check-report'
                --format 'ALL'
                --prettyPrint
                --noupdate
                --disableKnownExploited
              """, odcInstallation: 'OWASP-DepCheck-10'

              // publish XML results and fail build jika kritikal melebihi threshold
              dependencyCheckPublisher failedTotalCritical: 10, pattern: 'dependency-check-report/dependency-check-report.xml', stopBuild: true

              // publish HTML report ke Jenkins (sesuaikan reportDir jika HTML ada di subfolder)
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

              // publish JUnit report (dependency-check dapat menghasilkan JUnit XML)
              // allowEmptyResults: true -> agar tidak gagal jika file tidak ada
              junit allowEmptyResults: true, keepLongStdio: true, testResults: 'dependency-check-report/dependency-check-junit.xml'
            }
          }
        } // end OWASP-Dependency-Check
      } // end parallel
    } // end Dependency Scanning
  } // end stages

  post {
    always {
      archiveArtifacts artifacts: 'dependency-check-report/**', onlyIfSuccessful: false
      echo 'Build finished - artifacts archived (if any).'
    }
  }
}

import groovy.json.JsonSlurper
import java.security.*

def parseJson(jsonString) {
    def lazyMap = new JsonSlurper().parseText(jsonString)
    def m = [:]
    m.putAll(lazyMap)
    return m
}

def parseJsonArray(jsonString){
    def datas = readJSON text: jsonString
    return datas
}

def parseJsonString(jsonString, key){
    def datas = readJSON text: jsonString
    String Values = writeJSON returnText: true, json: datas[key]
    return Values
}

def parseYaml(jsonString) {
    def datas = readYaml text: jsonString
    String yml = writeYaml returnText: true, data: datas['kubernetes']
    return yml

}

def createYamlFile(data,filename) {
    writeFile file: filename, text: data
}

def returnSecret(path,secretValues){
    def secretValueFinal= []
    for(secret in secretValues) {
            def secretValue = [:]
            echo 'secrets -->'
            echo secret.envVariable
            echo secret.vaultKey
            //secretValue['envVar'] = secret.envVariable
            //secretValue['vaultKey'] = secret.vaultKey
            secretValue.put('envVar',secret.envVariable)
            secretValue.put('vaultKey',secret.vaultKey)
            print(secretValue)
            secretValueFinal.add(secretValue)
    }
    print(secretValueFinal)
    def secrets = [:]
    secrets["path"] = path
    secrets['engineVersion']=  2
    secrets['secretValues'] = secretValueFinal

    return secrets
}

// String str = ''
// loop to create a string as -e $STR -e $PTDF
def dockerVaultArguments(secretValues){
   def data = []
   for(secret in secretValues) {
       data.add('$'+secret.envVariable+' > .'+secret.envVariable)
   }
    print(data)
    return data
}

def dockerVaultArgumentsFile(secretValues){
   def data = []
   for(secret in secretValues) {
       data.add(secret.envVariable)
   }
    print(data)
    return data
}

def pushToCollector(){
  print("Inside pushToCollector...........")
    def job_name = "$env.JOB_NAME"
    def job_base_name = "$env.JOB_BASE_NAME"
    String generalProperties = parseJsonString(env.JENKINS_METADATA,'general')
    generalPresent = parseJsonArray(generalProperties)
    if(generalPresent.tenant != '' &&
    generalPresent.lazsaDomainUri != ''){
      echo "Job folder - $job_name"
      echo "Pipeline Name - $job_base_name"
      echo "Build Number - $currentBuild.number"
      sh """curl -k -X POST '${generalPresent.lazsaDomainUri}/collector/orchestrator/devops/details' -H 'X-TenantID: ${generalPresent.tenant}' -H 'Content-Type: application/json' -d '{\"jobName\" : \"${job_base_name}\", \"projectPath\" : \"${job_name}\", \"agentId\" : \"${generalPresent.agentId}\", \"devopsConfigId\" : \"${generalPresent.devopsSettingId}\", \"agentApiKey\" : \"${generalPresent.agentApiKey}\", \"buildNumber\" : \"${currentBuild.number}\" }' """
    }
}

def returnVaultConfig(vaultURL,vaultCredID){
    echo vaultURL
    echo vaultCredID
    def configurationVault = [:]
    //configurationVault["vaultUrl"] = vaultURL
    configurationVault["vaultCredentialId"] = vaultCredID
    configurationVault["engineVersion"] = 2
    return configurationVault
}

def waitforsometime() {
  sh 'sleep 5'
}

def checkoutRepository() {
  sh '''sudo chown -R `id -u`:`id -g` "$WORKSPACE" '''
  checkout([
    $class: 'GitSCM',
    branches: [[name: env.TESTCASEREPOSITORYBRANCH]],
    doGenerateSubmoduleConfigurations: false,
    extensions: [[$class: 'CleanCheckout']],
    submoduleCfg: [],
    userRemoteConfigs: [[credentialsId: env.SOURCECODECREDENTIALID,url: env.TESTCASEREPOSITORYURL]]
  ])
}

def getApplicationUrl(){
  def host
  if (env.DEPLOYMENT_TYPE == 'KUBERNETES'){
    kubernetesJsonString = parseJsonString(env.JENKINS_METADATA,'kubernetes')
    ingressJsonString = parseJsonString(kubernetesJsonString,'ingress')
    ingress = parseJsonArray(ingressJsonString)
    if(ingress['hosts']){
      hostname = ingress.hosts[0]
      print("hostname:"+hostname)
      host = hostname
    }
    else{
      host = generalPresent.ingressAddress
    }
    print("host in kubernetes:"+host)
  }
  else if(env.DEPLOYMENT_TYPE == 'EC2') {
    dockerProperties = parseJsonString(env.JENKINS_METADATA, 'docker')
    dockerData = parseJsonArray(dockerProperties)
    host = DOCKERHOST+':'+dockerData.hostPort
    print("host in ec2:"+host)
  }

  print("SITE_URL under test: http://${host}$CONTEXT/")
  return host;
}

def runSeleniumTest() {
  def host = getApplicationUrl()
  sh env.TESTCASECOMMAND + " -DSITE_URL=http://${host}$CONTEXT/ > maven_test.out || true "
  sh 'cat maven_test.out'
  sh script: """
             #!/bin/bash
             cat maven_test.out | egrep "^\\[(INFO|ERROR)\\] Tests run: [0-9]+, Failures: [0-9]+, Errors: [0-9]+, Skipped: [0-9]+\$" | cut -c 8- | awk 'BEGIN { for(i=1;i<=5;i++) printf "*+"; } {printf "%s",\$0 } END { for(i=1;i<=5;i++) printf "*+"; }'
             """
}

def runCypressTest() {
  def host = getApplicationUrl()

  sh """ 
  cat <<EOL > test.sh
  #!/bin/bash
  
  rm -rf node_modules/ mochawesome-report/ cypress/videos/ /cypress/screenshots/ 
  apt-get update
  apt-get install -y libgbm-dev
  npm install --save-dev mochawesome
  npm install mochawesome-merge --save-dev
  npm install
  case "$env.TESTCASECOMMAND" in 
    *env*)
        # Do stuff
        echo 'case env'
        $env.TESTCASECOMMAND applicationUrl=http://${host}$CONTEXT/ --browser $env.BROWSERTYPE --reporter mochawesome --reporter-options overwrite=false,html=false,json=true,charts=true
        ;;
    *)  
        echo 'case else'
        $env.TESTCASECOMMAND -- --env applicationUrl=http://${host}$CONTEXT/ --browser $env.BROWSERTYPE --reporter mochawesome --reporter-options overwrite=false,html=false,json=true,charts=true  
        ;;
  esac
  npx mochawesome-merge mochawesome-report/*.json > mochawesome-report/output.json
  npx marge mochawesome-report/output.json mochawesome-report  ./ --inline

  EOL
  """
  sh 'docker run -v "$WORKSPACE"/testcaseRepo:/app -w /app cypress/browsers:node14.19.0-chrome100-ff99-edge /bin/sh test.sh > test.out || true'
  sh 'cat test.out'
  sh """ 
 awk 'BEGIN { for(i=1;i<=5;i++) printf "*+"; } /(^[ ]*✖.+(failed|pended|pending|skipped|skipping)|^[ ]*✔[ ]+All specs passed).+/ {for(i=4;i>=0;i--) switch (i) {case 4: if( \$(NF-i) ~ /^[0-9]/ ){printf aggr "Tests run: "\$(NF-i) aggr ", ";} else{printf "Tests run: 0, " ;}  break; case 3: if( \$(NF-i) ~ /^[0-9]/ ){printf aggr "Passed: "\$(NF-i) aggr ", "} else{printf "Passed: 0, "} break; case 2: if( \$(NF-i) ~ /^[0-9]/ ){printf aggr "Failures: " \$(NF-i) aggr ", "} else{printf "Failures: 0, "}  break; case 1: if( \$(NF-i) ~ /^[0-9]/ ){printf aggr "Pending: " \$(NF-i) aggr ", "} else{printf "Pending: 0, "} break; case 0: if( \$(NF-i) ~ /^[0-9]/ ){printf aggr "Skipped: " \$(NF-i)} else{printf "Skipped: 0"} break; }} END { for(i=1;i<=5;i++) printf "*+"; }' test.out
  """
  sh 'pwd'
}

def publishResults(reportDir, reportFiles, reportName, reportTitles) {
  publishHTML([allowMissing: true,
               alwaysLinkToLastBuild: true,
               keepAll: true,
               reportDir: reportDir,
               reportFiles: reportFiles,
               reportName: reportName,
               reportTitles: reportTitles
  ])

  junit allowEmptyResults: true, testResults: 'target/surefire-reports/*.xml'

}

def testngPublishResults() {
  step([$class: 'Publisher', reportFilenamePattern: '**/testng-results.xml'])
}

def agentLabel = "${env.JENKINS_AGENT == null ? "":env.JENKINS_AGENT}"

pipeline {
  agent { label agentLabel }
  environment {
    DEFAULT_STAGE_SEQ = "'Initialization','Build','UnitTests','SonarQubeScan','BuildContainerImage','QualysScan','PublishContainerImage','Deploy','FunctionalTests','Destroy'"
    CUSTOM_STAGE_SEQ = "${DYNAMIC_JENKINS_STAGE_SEQUENCE}"
    PROJECT_TEMPLATE_ACTIVE = "${DYNAMIC_JENKINS_STAGE_NEEDED}"
    LIST = "${env.PROJECT_TEMPLATE_ACTIVE == 'true' ? env.CUSTOM_STAGE_SEQ : env.DEFAULT_STAGE_SEQ}"
    BRANCHES = "${env.GIT_BRANCH}"
    COMMIT = "${env.GIT_COMMIT}"
    RELEASE_NAME = "react17"
    SERVICE_PORT = "${APP_PORT}"
    DOCKERHOST = "${DOCKERHOST_IP}"
    REGISTRY_URL = "${DOCKER_REPO_URL}"
    ACTION = "${ACTION}"
    DEPLOYMENT_TYPE = "${DEPLOYMENT_TYPE == ""? "EC2":DEPLOYMENT_TYPE}"
    KUBE_SECRET = "${KUBE_SECRET}"
    CHROME_BIN = "/usr/bin/google-chrome"
    ARTIFACTORY = "${ARTIFACTORY == ""? "ECR":ARTIFACTORY}"
    ARTIFACTORY_CREDENTIALS = "${ARTIFACTORY_CREDENTIAL_ID}"
    SONAR_CREDENTIAL_ID= "${env.SONAR_CREDENTIAL_ID}"
    STAGE_FLAG = "${STAGE_FLAG}"
    JENKINS_METADATA = "${JENKINS_METADATA}"

    NODE_IMAGE = "circleci/node:16.13.1-bullseye-browsers" 
    KUBECTL_IMAGE_VERSION = "bitnami/kubectl:1.24.9" //https://hub.docker.com/r/bitnami/kubectl/tags
    HELM_IMAGE_VERSION = "alpine/helm:3.8.1" //https://hub.docker.com/r/alpine/helm/tags   
    OC_IMAGE_VERSION = "quay.io/openshift/origin-cli:4.9.0" //https://quay.io/repository/openshift/origin-cli?tab=tags

  }
  stages {
   stage('Initialization') {
         agent { label agentLabel }
         steps {
           script {
             def listValue = "$env.LIST"
             def list = listValue.split(',')
             print(list)
            // For Context Path read
            String generalProperties = parseJsonString(env.JENKINS_METADATA,'general')
            generalPresent = parseJsonArray(generalProperties)
            if(generalPresent.repoName == ''){
                generalPresent.repoName = env.RELEASE_NAME
            }

            env.CONTEXT = generalPresent.contextPath
            env.TESTCASEREPOSITORYURL = generalPresent.testcaseRepositoryUrl
            env.TESTCASEREPOSITORYBRANCH = generalPresent.testcaseRepositoryBranch
            env.SOURCECODECREDENTIALID = generalPresent.sourceCodeCredentialId
            env.TESTCASECOMMAND = generalPresent.testcaseCommand
            env.TESTINGTOOLTYPE = generalPresent.testingToolType
            env.BROWSERTYPE = generalPresent.browserType

         if (env.DEPLOYMENT_TYPE == 'KUBERNETES' || env.DEPLOYMENT_TYPE == 'OPENSHIFT') {
           String kubeProperties = parseJsonString(env.JENKINS_METADATA,'kubernetes')
           kubeVars = parseJsonArray(kubeProperties)

           if(kubeVars['vault']){
               String kubeData = parseJsonString(kubeProperties,'vault')
               def kubeValues = parseJsonArray(kubeData)
               if(kubeValues.type == 'vault'){
                   String helm_file = parseYaml(env.JENKINS_METADATA)
                   echo helm_file
                   createYamlFile(helm_file,"Helm.yaml")
               }
           }else {
                   String helm_file = parseYaml(env.JENKINS_METADATA)
                   echo helm_file
                   createYamlFile(helm_file,"Helm.yaml")
            }
         }
            def job_name = "$env.JOB_NAME"
            env.BUILD_TAG = "${BUILD_NUMBER}"
            print(job_name)
            def namespace = ''
            if (env.DEPLOYMENT_TYPE == 'KUBERNETES' || env.DEPLOYMENT_TYPE == 'OPENSHIFT'){
            if (kubeVars.namespace != null && kubeVars.namespace != '') {
                namespace = kubeVars.namespace
            }else{
                echo "namespace not received"
            }
            }
            print("kube namespace: $namespace")
            env.namespace_name = namespace
            if (env.STAGE_FLAG != 'null' && env.STAGE_FLAG != null) {
            stage_flag = parseJson("$env.STAGE_FLAG")
            } else {
             stage_flag = parseJson('{"qualysScan": false, "sonarScan": true, "zapScan": false, "rapid7Scan": false, "sysdig": false, "FunctionalTesting": false}')
            }
            if (!stage_flag) {
             stage_flag = parseJson('{"qualysScan": false, "sonarScan": true, "zapScan": false, "rapid7Scan": false, "sysdig": false, "FunctionalTesting": false}')
            }

            if (env.ARTIFACTORY == "ECR") {
            def url_string = "$REGISTRY_URL"
            url = url_string.split('\\.')
            env.AWS_ACCOUNT_NUMBER = url[0]
            env.ECR_REGION = url[3]
            echo "ecr region: $ECR_REGION"
            echo "ecr acc no: $AWS_ACCOUNT_NUMBER"
            } else if (env.ARTIFACTORY == "ACR") {
            def url_string = "$REGISTRY_URL"
            url = url_string.split('/')
            env.ACR_LOGIN_URL = url[0]
            echo "Reg Login url: $ACR_LOGIN_URL"
            }  else if (env.ARTIFACTORY == "JFROG") {
            def url_string = "$REGISTRY_URL"
            url = url_string.split('/')
            env.JFROG_LOGIN_URL = url[0]
            echo "Reg Login url: $JFROG_LOGIN_URL"
            }

            echo "defaultStagesSequence - $env.DEFAULT_STAGE_SEQ"
             for (int i = 0; i < list.size(); i++) {
               print(list[i])
               if ("${list[i]}" == "'UnitTests'" && env.ACTION == 'DEPLOY') {
                 stage('Unit Tests') {
                    sh """
                    docker run --rm --user root -v "$WORKSPACE":/home/circleci/app $NODE_IMAGE /bin/bash -c "cd /home/circleci/app &&  npm install && npm test"
                    sudo chown -R `id -u`:`id -g` "$WORKSPACE"
                    """
                 }
               }
               else if ("${list[i]}" == "'SonarQubeScan'" && env.ACTION == 'DEPLOY' && stage_flag['sonarScan']) {
                 stage('SonarQube Scan') {
                      def sonar_org = "${generalPresent.sonarOrg}";
                      def sonar_project_key = "${generalPresent.sonarProjectKey}";
                      if(sonar_org != null && sonar_org != '' && sonar_org != 'default-organization') {
                          sonar_project_key = "${sonar_org}" + "_" + "${sonar_project_key}";
                      }
                    
                     if (env.SONAR_CREDENTIAL_ID != null && env.SONAR_CREDENTIAL_ID != '') {
                       withCredentials([usernamePassword(credentialsId: "$SONAR_CREDENTIAL_ID", usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                            sh """
                              sed -i s+#SONAR_URL#+"${generalPresent.sonarHost}"+g ./sonar-project.properties
                              sed -i s+#SONAR_LOGIN#+$PASSWORD+g ./sonar-project.properties
                              sed -i s+#RELEASE_NAME#+"${sonar_project_key}"+g ./sonar-project.properties
                              sed -i s+#SONAR_ORGANIZATION#+"${generalPresent.sonarOrg}"+g ./sonar-project.properties
                              docker run --rm --user root -v "$WORKSPACE":/home/circleci/app $NODE_IMAGE /bin/bash -c "chown -R root:root /home/circleci/app && cd /home/circleci/app &&  npm install sonarqube-scanner -f && npm run sonar"
                              sudo chown -R `id -u`:`id -g` "$WORKSPACE"
                            """
                          }        
                    }
                     else{
                             withSonarQubeEnv('pg-sonar') {
                             sh """
                             sed -i s+#SONAR_URL#+$SONAR_HOST_URL+g ./sonar-project.properties
                             sed -i s+#SONAR_LOGIN#+$SONAR_AUTH_TOKEN+g ./sonar-project.properties
                             sed -i s+#RELEASE_NAME#+"${sonar_project_key}"+g ./sonar-project.properties
                             sed -i s+#SONAR_ORGANIZATION#+"${generalPresent.sonarOrg}"+g ./sonar-project.properties
                            docker run --rm --user root -v "$WORKSPACE":/home/circleci/app $NODE_IMAGE /bin/bash -c "chown -R root:root /home/circleci/app && cd /home/circleci/app &&  npm install sonarqube-scanner -f && npm run sonar"
                            sudo chown -R `id -u`:`id -g` "$WORKSPACE"
                            """
                          }
                    }
                  }
                }
               else if ("${list[i]}" == "'Build'" && env.ACTION == 'DEPLOY') {
                stage('Build') {
                 script {
                    echo "echoed BUILD_TAG--- $BUILD_TAG"
                 }
                }
               }else if ("${list[i]}" == "'BuildContainerImage'" && env.ACTION == 'DEPLOY') {
                         stage('Build Container Image') {   // no changes
                             // stage details here
                             echo "echoed BUILD_TAG--- $BUILD_TAG"
                               //Uncomment this block and modify as per your need if you want to use custom base image in Dockerfile from private repository
                               /*
                               withCredentials([usernamePassword(credentialsId: "$ARTIFACTORY_CREDENTIALS", usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                                  if (env.ARTIFACTORY == 'ECR') {
                                      sh 'set +x; AWS_ACCESS_KEY_ID=$USERNAME AWS_SECRET_ACCESS_KEY=$PASSWORD aws ecr get-login-password --region "$ECR_REGION" | docker login --username AWS --password-stdin $REGISTRY_URL ;set -x'
                                  }
                                  if (env.ARTIFACTORY == 'JFROG') {
                                      sh 'docker login -u "\"$USERNAME\"" -p "\"$PASSWORD\"" "$REGISTRY_URL"'
                                  }
                                  if (env.ARTIFACTORY == 'ACR') {
                                      sh 'docker login -u "\"$USERNAME\"" -p "\"$PASSWORD\"" "$ACR_LOGIN_URL"'
                                  }
                               } */
                             echo "value of CONTEXT = $CONTEXT"
                             if ((env.DEPLOYMENT_TYPE == 'EC2' || env.DEPLOYMENT_TYPE == 'KUBERNETES' || env.DEPLOYMENT_TYPE == 'OPENSHIFT') && (env.CONTEXT == 'null' || env.CONTEXT == '/')) {
                                 sh 'docker build -t "$REGISTRY_URL:$BUILD_TAG" -t "$REGISTRY_URL:latest" --build-arg DEFAULT_PORT=$SERVICE_PORT -f DockerfileNoContext .'
                             }
                             else if ((env.DEPLOYMENT_TYPE == 'EC2' || env.DEPLOYMENT_TYPE == 'KUBERNETES' || env.DEPLOYMENT_TYPE == 'OPENSHIFT') && env.CONTEXT != 'null') {
                                 sh 'docker build -t "$REGISTRY_URL:$BUILD_TAG" -t "$REGISTRY_URL:latest" --build-arg DEFAULT_PORT=$SERVICE_PORT -f Dockerfile .'
                             }
                         }
                }else if ("${list[i]}" == "'PublishContainerImage'" && (env.ACTION == 'DEPLOY' || env.ACTION == 'PROMOTE')) {
                          stage('Publish Container Image') {   // no changes
                              // stage details here

                              echo "Publish Container Image"
                              withCredentials([usernamePassword(credentialsId: "$ARTIFACTORY_CREDENTIALS", usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                                 if (env.ARTIFACTORY == 'ECR') {
                                     sh 'set +x; AWS_ACCESS_KEY_ID=$USERNAME AWS_SECRET_ACCESS_KEY=$PASSWORD aws ecr get-login-password --region "$ECR_REGION" | docker login --username AWS --password-stdin $REGISTRY_URL ;set -x'
                                 }
                                 if (env.ARTIFACTORY == 'JFROG') {
                                     sh 'docker login -u "\"$USERNAME\"" -p "\"$PASSWORD\"" "$REGISTRY_URL"'
                                 }
                                 if (env.ARTIFACTORY == 'ACR') {
                                     sh 'docker login -u "\"$USERNAME\"" -p "\"$PASSWORD\"" "$ACR_LOGIN_URL"'
                                 }
                             }
                                if (env.ACTION == 'DEPLOY') {
                                    sh 'docker push "$REGISTRY_URL:$BUILD_TAG"'
                                    sh 'docker push "$REGISTRY_URL:latest"'
                                }

                                if (env.ACTION == 'PROMOTE') {
                                    echo "------------------------------ inside promote condition -------------------------------"
                                     def registry_url_string = "${generalPresent.promoteSource}"
                                      withCredentials([usernamePassword(credentialsId: "${generalPresent.promoteSourceArtifactoryCredId}", usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                                          if ("${generalPresent.promoteSourceArtifactoryType}" == 'ECR') {
                                             temp_url = registry_url_string.split(':')
                                             temp_url2 = temp_url[0]
                                             url = temp_url2.split('\\.')
                                             env.PROMOTE_SOURCE_ECR_LOGIN_URL = temp_url[0]
                                             env.PROMOTE_SOURCE_ECR_REGION = url[3]
                                             echo "ecr region: $PROMOTE_SOURCE_ECR_REGION"
                                             sh 'set +x; AWS_ACCESS_KEY_ID=$USERNAME AWS_SECRET_ACCESS_KEY=$PASSWORD aws ecr get-login-password --region "$PROMOTE_SOURCE_ECR_REGION" | docker login --username AWS --password-stdin $PROMOTE_SOURCE_ECR_LOGIN_URL ;set -x'
                                          }
                                          if ("${generalPresent.promoteSourceArtifactoryType}" == 'JFROG') {
                                             temp_url = registry_url_string.split(':')
                                             env.PROMOTE_SOURCE_ACR_LOGIN_URL = temp_url[0]
                                             sh 'docker login -u "\"$USERNAME\"" -p "\"$PASSWORD\"" "$PROMOTE_SOURCE_ACR_LOGIN_URL"'
                                          }
                                          if ("${generalPresent.promoteSourceArtifactoryType}" == 'ACR') {
                                             temp_url = registry_url_string.split(':')
                                             env.PROMOTE_SOURCE_JFROG_LOGIN_URL = temp_url[0]
                                             sh 'docker login -u "\"$USERNAME\"" -p "\"$PASSWORD\"" "$PROMOTE_SOURCE_JFROG_LOGIN_URL"'
                                          }
                                      }
                                    sh """ docker pull "${generalPresent.promoteSource}" """
                                    sh """ docker image tag "${generalPresent.promoteSource}" "$REGISTRY_URL:${generalPresent.promoteTag}" """
                                    sh """ docker push "$REGISTRY_URL:${generalPresent.promoteTag}" """
                                    env.BUILD_TAG = "${generalPresent.promoteTag}"
                                }
                          }
                }
              else if ("${list[i]}" == "'QualysScan'" && env.ACTION == 'DEPLOY' && stage_flag['qualysScan']) {
                stage('Qualys Scan') {
                  getImageVulnsFromQualys credentialsId: "${generalPresent.qualysCredentialId}", imageIds: env.REGISTRY_URL+":"+env.BUILD_TAG, pollingInterval: '30', useLocalConfig: true, apiServer: "${generalPresent.qualysServerURL}", platform: 'PCP', vulnsTimeout: '600'
                }
            }
             else if ("${list[i]}" == "'Rapid7Scan'" && env.ACTION == 'DEPLOY' && stage_flag['rapid7Scan']) {
                stage('Rapid7 Scan') {
                    assessContainerImage failOnPluginError: true,
                    imageId: env.REGISTRY_URL+":"+env.BUILD_TAG,
                    thresholdRules: [
                    exploitableVulnerabilities(action: 'Mark Unstable', threshold: '1'),
                    criticalVulnerabilities(action: 'Fail', threshold: '1')
                    ],
                    nameRules: [
                    vulnerablePackageName(action: 'Fail', contains: 'nginx')
                    ]
                }
            }
            else if ("${list[i]}" == "'SysdigScan'" && env.ACTION == 'DEPLOY' && stage_flag['sysdigScan']) {
                stage('Sysdig Scan') {
                  sh 'echo  $REGISTRY_URL:$BUILD_TAG > sysdig_secure_images'
                  sh 'cat sysdig_secure_images'
                  sysdig inlineScanning: true, bailOnFail: true, bailOnPluginFail: true, name: 'sysdig_secure_images'
                }
            }
            else if ("${list[i]}" == "'Deploy'") {
                   stage('Deploy') {
                       if (env.ACTION == 'DEPLOY' || env.ACTION == 'PROMOTE' || env.ACTION == 'ROLLBACK') {

                           if (env.ACTION == 'ROLLBACK') {
                               echo "-------------------------------------- inside rollback condition -------------------------------"
                               env.BUILD_TAG = "${generalPresent.rollbackTag}"

                           }

                           if (env.DEPLOYMENT_TYPE == 'EC2') {
                               withCredentials([usernamePassword(credentialsId: "$ARTIFACTORY_CREDENTIALS", usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                                 if (env.ARTIFACTORY == 'ECR') {
                                     sh 'set +x; ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "AWS_ACCESS_KEY_ID=$USERNAME AWS_SECRET_ACCESS_KEY=$PASSWORD aws ecr get-login-password --region "$ECR_REGION" | docker login --username AWS --password-stdin $REGISTRY_URL " ;set -x'
                                 }
                                 if (env.ARTIFACTORY == 'JFROG') {
                                     sh 'ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "docker login -u "\"$USERNAME\"" -p "\"$PASSWORD\"" "$REGISTRY_URL""'
                                 }
                                 if (env.ARTIFACTORY == 'ACR') {
                                     sh 'ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "docker login -u "\"$USERNAME\"" -p "\"$PASSWORD\"" "$ACR_LOGIN_URL""'
                                 }
                               }

                               sh 'ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "sleep 5s"'
                               sh 'ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "docker pull "$REGISTRY_URL:$BUILD_TAG""'
                               sh """ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "docker stop "${generalPresent.repoName}" || true && docker rm "${generalPresent.repoName}" || true" """

                               // Read Docker Vault properties
                               String dockerProperties = parseJsonString(env.JENKINS_METADATA, 'docker')
                               dockerData = parseJsonArray(dockerProperties)
                               if (dockerData['vault']) {
                                   String vaultProperties = parseJsonString(dockerProperties, 'vault')
                                   def vaultType = parseJsonArray(vaultProperties)
                                   if (vaultType.type == 'vault') {
                                       echo "type is vault"
                                       env.VAULT_TYPE = 'vault'

                                       String vaultConfiguration = parseJsonString(vaultProperties, 'configuration')
                                       def vaultData = parseJsonArray(vaultConfiguration)
                                       def vaultConfigurations = returnVaultConfig(vaultData.vaultUrl, vaultData.vaultCredentialID)
                                       env.VAULT_CONFIG = vaultConfigurations
                                       // Getting the secret Values
                                       String vaultSecretValues = parseJsonString(vaultProperties, 'secrets')
                                       def vaultSecretData = parseJsonArray(vaultSecretValues)
                                       def vaultSecretConfigData = returnSecret(vaultSecretData.path, vaultSecretData.secretValues)
                                       env.VAULT_SECRET_CONFIG = vaultSecretConfigData
                                       def dockerEnv = dockerVaultArguments(vaultSecretData.secretValues)
                                       def secretkeys = dockerVaultArgumentsFile(vaultSecretData.secretValues)

                                       withVault([configuration: vaultConfigurations, vaultSecrets: [vaultSecretConfigData]]) {
                                           def data = []
                                           for (secret in dockerEnv) {
                                               sh "echo $secret"
                                           }
                                           for (keys in secretkeys) {
                                               sh "echo $keys=\$(cat .$keys) >> .secrets"
                                           }
                                           sh 'cat .secrets;'
                                       }
                                       def result = sh(script: 'cat .secrets', returnStdout: true)
                                       env.DOCKER_ENV_VAR = result
                                       sh 'scp -o "StrictHostKeyChecking=no" .secrets ciuser@$DOCKERHOST:/home/ciuser/docker-env'
                                       //sh 'ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "echo $SECRETS > secrets"'
                                       sh 'rm -rf .secrets'
                                       if (env.DEPLOYMENT_TYPE == 'EC2' && env.CONTEXT == 'null') {
                                           sh """ ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "docker run -d --restart always --name "${generalPresent.repoName}"  --env-file docker-env -p ${dockerData.hostPort}:$SERVICE_PORT -e PORT=$SERVICE_PORT $REGISTRY_URL:$BUILD_TAG" """
                                       } else if (env.DEPLOYMENT_TYPE == 'EC2' && env.CONTEXT != 'null') {
                                           sh """ ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "docker run -d --restart always --name "${generalPresent.repoName}"  --env-file docker-env   -p ${dockerData.hostPort}:$SERVICE_PORT -e context=$CONTEXT -e PORT=$SERVICE_PORT $REGISTRY_URL:$BUILD_TAG" """
                                       }
                                   }
                               } else {

                                   if (env.DEPLOYMENT_TYPE == 'EC2' && env.CONTEXT == 'null') {
                                       sh """ ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "docker run -d --restart always --name "${generalPresent.repoName}" -p ${dockerData.hostPort}:$SERVICE_PORT -e PORT=$SERVICE_PORT $REGISTRY_URL:$BUILD_TAG" """
                                   } else if (env.DEPLOYMENT_TYPE == 'EC2' && env.CONTEXT != 'null') {
                                       sh """ ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "docker run -d --restart always --name "${generalPresent.repoName}" -p ${dockerData.hostPort}:$SERVICE_PORT -e context=$CONTEXT -e PORT=$SERVICE_PORT $REGISTRY_URL:$BUILD_TAG" """
                                   }
                               }
                           }
                           if (env.DEPLOYMENT_TYPE == 'KUBERNETES' || env.DEPLOYMENT_TYPE == 'OPENSHIFT') {
                               withCredentials([file(credentialsId: "$KUBE_SECRET", variable: 'KUBECONFIG'), usernamePassword(credentialsId: "$ARTIFACTORY_CREDENTIALS", usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                                  sh """
                                     sed -i s+#SERVICE_NAME#+"${generalPresent.helmReleaseName}"+g ./helm_chart/values.yaml ./helm_chart/Chart.yaml
                                     docker run --rm  --user root -v "$KUBECONFIG":"$KUBECONFIG" -e KUBECONFIG="$KUBECONFIG" $KUBECTL_IMAGE_VERSION create ns "$namespace_name" || true
                                  """
                                  if (env.DEPLOYMENT_TYPE == 'OPENSHIFT') {

                                    sh '''
                                        COUNT=$(grep 'serviceAccount' Helm.yaml | wc -l)
                                        if [[ $COUNT -gt 0 ]]
                                        then
                                            ACCOUNT=$(grep 'serviceAccount:' Helm.yaml | tail -n1 | awk '{ print $2}')
                                            echo $ACCOUNT
                                        else
                                            ACCOUNT='default'
                                        fi
                                        docker run --rm  --user root -v "$KUBECONFIG":"$KUBECONFIG" -e KUBECONFIG="$KUBECONFIG" -v "$WORKSPACE":/apps -w /apps $OC_IMAGE_VERSION oc adm policy add-scc-to-user anyuid -z $ACCOUNT -n "$namespace_name"
                                    '''
                                  }

                                   env.kube_secret_name_for_registry = "$ARTIFACTORY_CREDENTIALS".toLowerCase()
                                   if (env.ARTIFACTORY == 'JFROG') {
                                       sh '''
                                       docker run --rm  --user root -v "$KUBECONFIG":"$KUBECONFIG" -e KUBECONFIG="$KUBECONFIG" $KUBECTL_IMAGE_VERSION -n "$namespace_name" delete secret $kube_secret_name_for_registry --ignore-not-found || true
                                       docker run --rm  --user root -v "$KUBECONFIG":"$KUBECONFIG" -e KUBECONFIG="$KUBECONFIG" $KUBECTL_IMAGE_VERSION -n "$namespace_name" create secret docker-registry $kube_secret_name_for_registry --docker-server="$JFROG_LOGIN_URL" --docker-username="\"$USERNAME\"" --docker-password="\"$PASSWORD\"" || true
                                       '''
                                   }
                                   if (env.ARTIFACTORY == 'ACR') {
                                       sh '''
                                         docker run --rm  --user root -v "$KUBECONFIG":"$KUBECONFIG" -e KUBECONFIG="$KUBECONFIG" $KUBECTL_IMAGE_VERSION -n "$namespace_name" delete secret $kube_secret_name_for_registry --ignore-not-found || true
                                         docker run --rm  --user root -v "$KUBECONFIG":"$KUBECONFIG" -e KUBECONFIG="$KUBECONFIG" $KUBECTL_IMAGE_VERSION -n "$namespace_name" create secret docker-registry $kube_secret_name_for_registry --docker-server="$ACR_LOGIN_URL" --docker-username="\"$USERNAME\"" --docker-password="\"$PASSWORD\"" || true
                                       '''
                                   }
                                   sh """
                                   ls -lart
                                   echo "context: $CONTEXT" >> Helm.yaml
                                   cat Helm.yaml
                                   sed -i s+#SERVICE_NAME#+"${generalPresent.helmReleaseName}"+g ./helm_chart/values.yaml ./helm_chart/Chart.yaml
                                   docker run --rm  --user root -v "$KUBECONFIG":"$KUBECONFIG" -e KUBECONFIG="$KUBECONFIG" -v "$WORKSPACE":/apps -w /apps $HELM_IMAGE_VERSION upgrade --install "${generalPresent.helmReleaseName}" -n "$namespace_name" helm_chart --atomic --timeout 300s --set image.repository="$REGISTRY_URL" --set image.tag="$BUILD_TAG" --set image.registrySecret="$kube_secret_name_for_registry"  --set service.internalport="$SERVICE_PORT" -f Helm.yaml
                                   """
                               }
                           }
                       }
                   }
               } else if ("${list[i]}" == "'FunctionalTests'" && env.ACTION == 'DEPLOY' && stage_flag['FunctionalTesting']) {
                   stage('Functional Tests') {
                       waitforsometime()
                       dir('testcaseRepo') {
                           checkoutRepository()
                           if (env.TESTINGTOOLTYPE == 'selenium') {
                               runSeleniumTest()
                               publishResults('', 'target/surefire-reports/index.html', 'Selenium Test Report', 'Selenium Test Report')
                               testngPublishResults()
                           } else if (env.TESTINGTOOLTYPE == 'cypress') {
                               runCypressTest()
                               publishResults('mochawesome-report', 'output.html', 'Cypress Test Report', 'Cypress Test Report')
                           }
                       }
                   }
               } else if ("${list[i]}" == "'Destroy'" && env.ACTION == 'DESTROY') {
                stage('Destroy') {
                 if (env.DEPLOYMENT_TYPE == 'EC2') {
                    sh """ ssh -o "StrictHostKeyChecking=no" ciuser@$DOCKERHOST "docker stop ${generalPresent.repoName} || true && docker rm ${generalPresent.repoName} || true" """
                 }
                 if (env.DEPLOYMENT_TYPE == 'KUBERNETES' || env.DEPLOYMENT_TYPE == 'OPENSHIFT') {
                   withCredentials([file(credentialsId: "$KUBE_SECRET", variable: 'KUBECONFIG')]) {
                      sh """
                      docker run --rm  --user root -v "$KUBECONFIG":"$KUBECONFIG" -e KUBECONFIG="$KUBECONFIG" -v "$WORKSPACE":/apps -w /apps $HELM_IMAGE_VERSION uninstall "${generalPresent.helmReleaseName}" -n "$namespace_name"
                      """
                   }
                 }
                }
               }
             }
           }
         }
      }
   }
   post {
        always { 
            sh """ sudo chown -R `id -u`:`id -g` "$WORKSPACE" """
            pushToCollector()
        }       
        cleanup {
                sh 'docker  rmi  $REGISTRY_URL:$BUILD_TAG $REGISTRY_URL:latest || true'
        }
  }
}


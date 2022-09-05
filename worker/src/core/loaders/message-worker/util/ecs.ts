import config from '@core/config'
import ECS from 'aws-sdk/clients/ecs'
import { AWSError } from 'aws-sdk/lib/error'
import axios from 'axios'
import { loggerWithLabel } from '@core/logger'

const logger = loggerWithLabel(module)
const ECSClient = new ECS({ region: config.get('aws.awsRegion') })
const taskKeyword = ':task/'
const clusterKeyword = ':cluster/'
const getLabel = (v: string, keyword: string): string =>
  v.substring(v.indexOf(keyword) + keyword.length)
class ECSUtil {
  static clusterName: string
  static taskARN: string
  static hasLoaded = false

  static getWorkerId(index: string): string {
    if (!this.hasLoaded) throw new Error('ECSUtil has not been loaded')
    return this.taskARN || index
  }
  static getWorkersInService(): Promise<string[]> {
    if (!this.hasLoaded) throw new Error('ECSUtil has not been loaded')
    return new Promise((resolve, reject) => {
      ECSClient.listTasks(
        {
          serviceName: config.get('aws.serviceName'),
          cluster: this.clusterName,
          desiredStatus: 'RUNNING',
        },
        (err: AWSError, data: ECS.ListTasksResponse) => {
          if (err) reject(err)
          resolve(
            data.taskArns?.map((taskArn) =>
              getLabel(taskArn, taskKeyword)
            ) as string[]
          )
        }
      )
    })
  }
  static load(): Promise<void> {
    logger.info({
      message: 'Loading ECSUtil',
      prod: config.get('env') !== 'development',
      metadataUri: config.get('aws.metadataUri'),
      action: 'load',
    })
    if (config.get('env') !== 'development' && config.get('aws.metadataUri')) {
      return axios
        .get(`${config.get('aws.metadataUri')}/task`)
        .then((response) => {
          logger.info({ ...response.data, action: 'load' })
          const data: { Cluster: string; TaskARN: string } = response.data
          // "Cluster": "arn:aws:ecs:us-west-2:&ExampsleAWSAccountNo1;:cluster/clusterName",
          // "TaskARN": "arn:aws:ecs:us-west-2:&ExampleAWSAccountNo1;:task/taskARN",

          this.clusterName = getLabel(data['Cluster'], clusterKeyword)
          this.taskARN = getLabel(data['TaskARN'], taskKeyword)
          logger.info({
            clusterName: this.clusterName,
            taskARN: this.taskARN,
            action: 'load',
          })
        })
        .then(() => {
          this.hasLoaded = true
          logger.info({ message: 'ECSUtil loaded for prod', action: 'load' })
        })
    } else {
      this.hasLoaded = true
      logger.info({ message: 'ECSUtil loaded for dev', action: 'load' })
    }
    return Promise.resolve()
  }
}

export default ECSUtil

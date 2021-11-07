/* eslint-disable */

// Example backup completed RDS event. See https://docs.amazonaws.cn/en_us/lambda/latest/dg/services-rds.html
module.exports = {
  "Records":[
     {
        "EventSource":"aws:sns",
        "EventVersion":"1.0",
        "EventSubscriptionArn":"arn:aws:sns:us-east-2:123456789012:db-rds-events:21be56ed-a058-49f5-8c98-aedd2564c486",
        "Sns":{
           "Type":"Notification",
           "MessageId":"59aaab88-c2a3-554e-801b-f18ad03ba813",
           "TopicArn":"arn:aws:sns:us-east-2:123456789012:db-rds-events",
           "Subject":"RDS Notification Message",
           "Message":"{\"Event Source\":\"db-cluster-snapshot\",\"Event Time\":\"2021-11-07 17:43:51.876\",\"Identifier Link\":\"https://console.aws.amazon.com/rds/home?region=us-east-2#snapshot:engine=aurora;id=db-instance-aurora\",\"Source ID\":\"db-instance-aurora\",\"Source ARN\":\"arn:aws:rds:us-east-2:123456789012:cluster-snapshot:db-instance-aurora\",\"Event ID\":\"http://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.html#RDS-EVENT-0169\",\"Event Message\":\"Automated cluster snapshot created\"}",
           "Timestamp":"2021-11-07T17:43:52.348Z",
           "SignatureVersion":"1",
           "Signature":"be9Oihv5FuP3nX0V...Fg==",
           "SigningCertUrl":"https://sns.us-east-2.amazonaws.com/SimpleNotificationService-ac565b8b1a6c5d002d285f9598aa1d9b.pem",
           "UnsubscribeUrl":"https://sns.us-east-2.amazonaws.com/?Action=Unsubscribe&amp;SubscriptionArn=arn:aws-cn:sns:us-east-2:123456789012:test-lambda:21be56ed-a058-49f5-8c98-aedd2564c486",
           "MessageAttributes":{
              
           }
        }
     }
  ]
}

// import { google } from 'googleapis'
// const run = google.run('v1');
// import './config'

// // const defaultOptions = {
// //     rootUrl: 'https://asia-southeast1-run.googleapis.com', // can use different region if you want
// // }

// // const CREDENTIALS = {}

// /**
//  * Triggered from a message on a Cloud Pub/Sub topic.
//  *
//  * @param {!Object} event Event payload.
//  * @param {!Object} context Metadata for the event.
//  */
// exports.helloPubSub = async (event: any) => {
//   // console.log(Buffer.from(event.data, 'base64').toString());
//   console.log(event)

//   const auth = new google.auth.GoogleAuth({
//     scopes: ['https://www.googleapis.com/auth/cloud-platform'], // doesn't work without this
//     // credentials: CREDENTIALS, // you can omit to use creds from environement
//   })
//   const authClient = await auth.getClient()
//   google.options({auth: authClient});
//   // const run = new run_v1.Run({
//   //     auth: authClient,
//   // })
//   try {
//     console.log('get services')
//     // const namespace_id = 'postmangovsg'
//     // const service_id = 'servicename'
//     // const services = await run.namespaces.services.list({
//     //   parent: 'namespaces/postmangovsg'
//     })

//     const create = await run.namespaces.services.create({
//       parent: 'namespaces/postmangovsg',
//       requestBody: {
//         apiVersion: "serving.knative.dev/v1",
//         kind: "Service",
//         metadata: {
//           name: 'verify-backup',
//           namespace: 'postmangovsg',
//         },
//         spec: {
//           template: {
//             metadata: {},
//             spec:{
//               serviceAccountName: 'verfy-rds-backup@postmangovsg.iam.gserviceaccount.com'
//             }
//           }
//         },
//         status: {
        
//         }
//       }
//     })
//     console.log(create)
//   } catch (e) {
//     // console.error(e)
//     console.error(e)
//   }
// };

// exports.helloPubSub()

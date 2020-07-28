import { CampaignUnsubscribeList } from '../interface'

/**
 * Generates unsubscribe digest email body by concatenating
 * an introduction template, the generated unsubscribers per campaign
 * and an ending template
 */
export const createEmailBody = (
  campaigns: Array<CampaignUnsubscribeList>
): string => {
  const intro = `
    Greetings from the Postman team,<br><br>
    In order to comply with Singapore's Spam Control Act and align with 
    international bulk email practices, Postman has implemented an option 
    for the recipient to unsubscribe to future emails. Campaign owners will 
    receive a weekly list of people who have indicated their wish to unsubscribe 
    from your emails. Please exercise your best judgment to determine whether 
    or not to remove these recipients from your mailing list based on the content 
    of your email. If your email is promotional in nature, please remove these 
    recipients from your mailing list to respect their wishes.<br><br>
  `

  let digest = ''
  for (const campaign of campaigns) {
    digest += campaignDigest(campaign)
  }

  const signOff = `
    Please visit our guide if you have additional questions on the unsubscribe feature for the recipient.<br><br>
    Thank you,<br>
    Postman.gov.sg
  `

  return `${intro}${digest}${signOff}`
}

/**
 * Generates a template of campaign name and a list of unsubcribers
 */
const campaignDigest = ({
  name,
  unsubscribers,
}: CampaignUnsubscribeList): string => {
  return `
    <b>Campaign name</b>: ${name}<br>
    <b>Unsubscribed recipients</b>:<br>
    ${unsubscribers.join('<br>')}<br><br>
  `
}

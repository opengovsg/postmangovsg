export default class OnpremWhatsappClient {
  public async send(
    recipient: string,
    templateName: string,
    paramValues: string[]
  ): Promise<string> {
    await fetch('https://webhook.site/f1affce5-a43d-4aec-a43a-5f145c53b260', {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en',
          },
          components: paramValues.map((v) => ({
            type: 'text',
            text: v,
          })),
        },
      }),
    })
    return Date.now().toString()
  }
}

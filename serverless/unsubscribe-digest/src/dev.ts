import readline from 'readline'
import { handler } from './index'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const prompt = () => {
  rl.question(
    '\nPress [ENTER] to send unsub digest (ctrl-c twice to quit): ',
    async () => {
      try {
        await handler()
        console.log('Completed')
      } catch (err) {
        console.log('Sending failed')
      }
      prompt()
    }
  )
}

prompt()

// require buffer with trailing slash to ensure use of the npm module named buffer
// instead of the node.js core module named buffer
import { Buffer } from 'buffer/'
import { useState } from 'react'

import { uuid } from 'uuidv4'

import styles from './CryptoTest.module.scss'

import {
  TextArea,
  TextInput,
  PrimaryButton,
  ErrorBlock,
  Checkbox,
} from 'components/common'
import { encryptData, sha256 } from 'services/crypto.service'

const LOREM_DIMSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer lobortis dolor at ex mollis, in pulvinar justo tincidunt. Cras dictum lorem eu sapien ultricies aliquet. Integer mollis ante non est sollicitudin placerat. Nam dolor sem, ultrices eu posuere et, fringilla et nisi. Interdum et malesuada fames ac ante ipsum primis in faucibus. Pellentesque sit amet massa mi. Sed vitae diam dapibus, maximus elit in, mattis lectus. Donec nec lacinia mauris. Morbi non mollis lacus, sit amet dapibus est. Ut nibh ex, dapibus sed nulla at, consequat lacinia quam.

Cras cursus sit amet mi eget vulputate. Donec sodales mauris et condimentum sagittis. Nunc venenatis mauris eget nisl commodo, at ornare velit molestie. Integer et ullamcorper orci. Integer nec aliquam nunc, at pharetra purus. Cras placerat egestas libero, vitae tempor ligula dignissim sit amet. Etiam ut nunc blandit, euismod nunc sed, consectetur quam. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.

Nulla sit amet ex est. Nam egestas massa suscipit, laoreet lorem eu, consequat sem. Cras vitae fringilla ante. Nam eu vestibulum ipsum. Vestibulum quis volutpat neque, in molestie eros. In hac habitasse platea dictumst. Vestibulum sagittis iaculis lacus, in interdum lectus laoreet lobortis. Duis tortor turpis, pharetra non auctor et, volutpat ac magna.

Integer ullamcorper augue nec semper porta. Sed condimentum sagittis quam, sit amet elementum lorem semper ut. Suspendisse potenti. Vivamus facilisis cursus malesuada. Aenean quis lobortis erat. Vestibulum sollicitudin odio ut ante pellentesque, eget aliquam magna hendrerit. Ut non est quis ante euismod accumsan nec eu leo. Suspendisse in ipsum efficitur, tempor augue nec, posuere neque. Pellentesque et mauris fermentum, suscipit elit et, mollis nisi.

Suspendisse porta a elit nec ullamcorper. Etiam fringilla velit pretium porta fringilla. Vivamus fringilla bibendum metus, nec suscipit felis tincidunt et. Nunc nec nulla id sapien venenatis semper a eu velit. Donec condimentum tempor mauris, at fermentum eros mattis sed. Ut aliquam pellentesque sem vitae rutrum. Fusce sed venenatis risus. Mauris at enim ut dolor consectetur condimentum scelerisque nec lectus. Suspendisse egestas ex sed magna commodo blandit. Vivamus sodales nisi interdum ligula suscipit euismod. Mauris ut tempor sem. Suspendisse commodo, dui vitae rutrum venenatis, leo magna accumsan felis, vel iaculis justo mauris sed elit. Suspendisse potenti. Mauris leo leo, fringilla non facilisis ut, maximus ut odio. In ultrices, ligula sit amet laoreet feugiat, augue odio faucibus orci, sit amet ornare velit est eu urna. Cras vel malesuada tortor.

Sed euismod non metus nec aliquam. Morbi est leo, sodales luctus quam at, egestas suscipit est. Donec non malesuada ipsum. Cras aliquet vehicula purus ac eleifend. Donec ultrices congue mi non porta. Vestibulum ultricies tortor sed sem eleifend sagittis. Duis sed odio euismod, aliquet massa sit amet, suscipit libero. Morbi et nisi mattis, venenatis odio commodo, pellentesque massa. Pellentesque ut sodales ante. Integer tempus faucibus mauris feugiat auctor. Etiam velit ante, rutrum placerat ornare nec, laoreet vitae tortor. Phasellus convallis ipsum et nibh consequat imperdiet. Quisque lacus massa, vestibulum eget sem nec, sodales semper eros. Quisque sed arcu et eros scelerisque aliquam sit amet nec nunc. Fusce dictum id justo et aliquam.

Nam sagittis auctor purus, id maximus magna tempus eget. Pellentesque tincidunt odio sed massa fringilla mattis ut non felis. Donec scelerisque est in magna maximus condimentum. Praesent porta nisl ac ipsum mattis dapibus. Quisque et nunc a ligula blandit malesuada. Nam vel condimentum nisl. Vestibulum cursus, arcu vitae placerat faucibus, tortor elit pretium ex, in vehicula neque libero quis leo. Integer iaculis ut felis nec placerat. Phasellus vehicula lectus eget facilisis consequat.`

const CryptoTest = () => {
  const [body, setBody] = useState(LOREM_DIMSUM)
  const [rounds, setRounds] = useState(1)
  const [iterations, setIterations] = useState(4000)
  const [timeTaken, setTimeTaken] = useState('')
  const [password, setPassword] = useState('password')
  const [salt, setSalt] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [print, setPrint] = useState(false)

  async function encrypt() {
    setSpinning(true)
    try {
      const start = performance.now()
      for (let i = 0; i < rounds; i++) {
        const { key } = await encryptData(
          body,
          password,
          salt || uuid(),
          iterations
        )
        if (print) {
          // eslint-disable-next-line no-console
          console.log(Buffer.from(key).toString('base64'))
        }
      }
      const end = performance.now()
      setTimeTaken(`${end - start} ms`)
    } catch (e) {
      setErrorMsg((e as Error).message)
    }
    setSpinning(false)
  }

  async function hash() {
    setSpinning(true)

    try {
      const start = performance.now()
      for (let i = 0; i < rounds; i++) {
        await sha256(password)
      }
      const end = performance.now()
      setTimeTaken(`${end - start} ms`)
    } catch (e) {
      setErrorMsg((e as Error).message)
    }
    setSpinning(false)
  }

  return (
    <div className={styles.container}>
      <h3>Payload</h3>
      <TextArea
        highlight={false}
        placeholder=""
        value={body}
        onChange={setBody}
      ></TextArea>
      <h3>Password</h3>
      <TextInput value={password} onChange={setPassword}></TextInput>
      <h3>Salt</h3>
      <TextInput
        value={salt}
        onChange={setSalt}
        placeholder="<Randomized UUID>"
      ></TextInput>
      <h3>PBKDF2 Iterations</h3>
      <TextInput
        value={iterations}
        onChange={setIterations}
        type="number"
      ></TextInput>
      <div className={styles.row}>
        <TextInput
          value={rounds}
          onChange={setRounds}
          type="number"
        ></TextInput>
        <p>times</p>
        <PrimaryButton className={styles.button} onClick={encrypt}>
          Encrypt
        </PrimaryButton>
        <PrimaryButton className={styles.button} onClick={hash}>
          Hash
        </PrimaryButton>
      </div>
      <Checkbox checked={print} onChange={setPrint}>
        Print derived key in console
      </Checkbox>
      <h3>Time taken:</h3>
      {spinning ? (
        <i className="bx bx-loader-alt bx-spin"></i>
      ) : (
        <h4>{timeTaken}</h4>
      )}
      <ErrorBlock>{errorMsg}</ErrorBlock>
    </div>
  )
}

export default CryptoTest

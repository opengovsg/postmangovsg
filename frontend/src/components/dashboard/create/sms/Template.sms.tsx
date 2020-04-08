import React, { useState } from 'react'

import { TextArea } from 'components/common'

const TemplateSMS = ({ body }: { body: string }) => {

  const [value, setValue] = useState(body)

  return (
    <>
      <h2>Create message template</h2>
      <h4>Message</h4>
      <p>

      </p>
      <TextArea highlight={true} value={value} onChange={setValue} />
    </>
  )
}

export default TemplateSMS

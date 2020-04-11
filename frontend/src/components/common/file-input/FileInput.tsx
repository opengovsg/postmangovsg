import React from 'react'

import styles from './FileInput.module.scss'

const FileInput = ({ isProcessing, onFileSelected }: { isProcessing: boolean; onFileSelected: Function }) => {
  return (
    <div className={styles.container}>
      <input id="recipient-upload-input" type="file" name="file" accept=".csv" disabled={isProcessing} onChange={(e) => onFileSelected(e.target.files)} />
      <label htmlFor="recipient-upload-input">
        {isProcessing
          ? <>Uploading< i className='bx bx-loader-alt bx-spin' ></i></>
          : <>Upload File <i className="bx bx-upload"></i></>
        }
      </label>
    </div >
  )
}

export default FileInput
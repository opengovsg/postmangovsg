import React from 'react'

import styles from './FileInput.module.scss'

const FileInput = ({
  isProcessing,
  onFileSelected,
  label = 'Upload',
}: {
  isProcessing: boolean
  onFileSelected: Function
  label?: string
}) => {
  return (
    <div className={styles.container}>
      <input
        id="recipient-upload-input"
        type="file"
        name="file"
        accept=".csv"
        disabled={isProcessing}
        onClick={(e) => ((e.target as HTMLInputElement).value = '')} // reset target value to allow selecting of new files
        onChange={(e) => onFileSelected(e.target.files)}
      />
      <label htmlFor="recipient-upload-input">
        {isProcessing ? (
          <>
            {label}ing<i className="bx bx-loader-alt bx-spin"></i>
          </>
        ) : (
          <>
            {label} File <i className="bx bx-upload"></i>
          </>
        )}
      </label>
    </div>
  )
}

export default FileInput

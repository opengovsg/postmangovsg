import styles from './FileInput.module.scss'

const FileInput = ({
  isProcessing,
  onFileSelected,
  label = 'Upload',
  disabled,
}: {
  isProcessing: boolean
  onFileSelected: (files: FileList) => Promise<void>
  label?: string
  disabled?: boolean
}) => {
  return (
    <div className={styles.container}>
      <input
        id="recipient-upload-input"
        type="file"
        name="file"
        accept=".csv"
        disabled={disabled || isProcessing}
        onClick={(e) => ((e.target as HTMLInputElement).value = '')} // reset target value to allow selecting of new files
        onChange={(e) => {
          if (e.target.files) void onFileSelected(e.target.files)
        }}
      />
      <label role="button" htmlFor="recipient-upload-input">
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

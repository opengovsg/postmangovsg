import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import {
  uploadFileToS3,
  deleteCsvStatus,
  getCsvStatus,
  CsvStatusResponse,
} from 'services/upload.service'

import { protectAndUploadCsv } from 'services/protect-csv.service'
import {
  FileInput,
  CsvUpload,
  ErrorBlock,
  PreviewBlock,
  PrimaryButton,
  SampleCsv,
} from 'components/common'
import { EmailCampaign, EmailPreview } from 'classes'
import { sendTiming } from 'services/ga.service'

import styles from '../Create.module.scss'

const EmailRecipients = ({
  csvFilename: initialCsvFilename,
  numRecipients: initialNumRecipients,
  params,
  isProcessing: initialIsProcessing,
  onNext,
}: {
  csvFilename: string
  numRecipients: number
  params: Array<string>
  isProcessing: boolean
  onNext: (changes: Partial<EmailCampaign>, next?: boolean) => void
}) => {
  const [errorMessage, setErrorMessage] = useState(null)
  const [isCsvProcessing, setIsCsvProcessing] = useState(initialIsProcessing)
  const [isUploading, setIsUploading] = useState(false)
  const [csvInfo, setCsvInfo] = useState<
    Omit<CsvStatusResponse, 'isCsvProcessing' | 'preview'>
  >({
    numRecipients: initialNumRecipients,
    csvFilename: initialCsvFilename,
  })
  const [preview, setPreview] = useState({} as EmailPreview)
  const { id: campaignId } = useParams()

  const { csvFilename, numRecipients = 0 } = csvInfo

  // Poll csv status
  useEffect(() => {
    if (!campaignId) return

    let timeoutId: NodeJS.Timeout
    const pollStatus = async () => {
      try {
        const { isCsvProcessing, preview, ...newCsvInfo } = await getCsvStatus(
          +campaignId
        )
        setIsCsvProcessing(isCsvProcessing)
        setCsvInfo(newCsvInfo)
        if (preview) {
          setPreview(preview as EmailPreview)
        }
        if (isCsvProcessing) {
          timeoutId = setTimeout(pollStatus, 2000)
        }
      } catch (e) {
        setErrorMessage(e.message)
      }
    }

    // Retrieve status regardless of isCsvProcessing to retrieve csvError if any
    // If completed, it will only poll once
    pollStatus()

    return () => clearTimeout(timeoutId)
  }, [campaignId, isCsvProcessing])

  // If campaign properties change, bubble up to root campaign object
  useEffect(() => {
    onNext({ isCsvProcessing, csvFilename, numRecipients }, false)
  }, [isCsvProcessing, csvFilename, numRecipients, onNext])

  // Handle file upload
  async function uploadFile(files: File[]) {
    setIsUploading(true)
    setErrorMessage(null)
    const uploadTimeStart = performance.now()

    try {
      // user did not select a file
      if (!files[0] || !campaignId) {
        return
      }
      clearCsvStatus()
      await protectAndUploadCsv(
        +campaignId,
        files[0],
        `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce eu molestie eros. Fusce ipsum sapien, malesuada vitae mauris vitae, condimentum tempus eros. Maecenas euismod augue sit amet ante pharetra condimentum. Nunc non iaculis libero. Vestibulum ultricies, odio nec dapibus tempus, odio nisi interdum arcu, ut tincidunt purus leo a nibh. Fusce aliquet malesuada libero in fermentum. Nullam non dolor blandit est consectetur iaculis ut ultrices lorem. Aenean vitae arcu et eros congue condimentum. Suspendisse vehicula ante nulla, sed vulputate tortor blandit vel. Nam auctor ante vitae placerat auctor. Aenean ut pretium neque.

        Curabitur vel gravida enim. Cras faucibus enim hendrerit egestas sodales. Sed ac enim facilisis, bibendum nunc a, consequat urna. In ut condimentum felis. Nunc tincidunt magna vitae pretium pulvinar. Cras et pellentesque ligula. Nullam non molestie neque. Duis egestas ligula vitae orci feugiat, et convallis nulla finibus. Vivamus dictum ultricies eros, a egestas nisl porttitor sit amet. Nunc congue accumsan urna non ultrices. Quisque venenatis eu elit vitae semper.
        
        In sollicitudin dolor eu laoreet consectetur. Pellentesque sed urna pharetra augue vehicula volutpat sed eu orci. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nullam eget fringilla ex. Aliquam suscipit gravida molestie. Maecenas egestas ipsum cursus fermentum gravida. Cras suscipit auctor felis vel vulputate. Sed leo nisi, ullamcorper in est eget, blandit auctor metus.
        
        Nunc commodo turpis est. Mauris tempus tincidunt tristique. Phasellus ultrices lectus ornare est feugiat varius. Aenean quis pretium lacus. Fusce quis sollicitudin nisi. Vestibulum porttitor mattis sodales. Proin tortor libero, dapibus eget sagittis vitae, blandit nec risus. Vestibulum mattis eu sapien sed vulputate. Sed dolor nunc, lacinia sit amet egestas ut, venenatis ut ipsum. Donec pretium dolor id ex facilisis, nec consectetur leo tristique. Nam vitae eros purus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam semper scelerisque massa, vel mattis libero dignissim sed. Aenean lacinia arcu eu metus accumsan luctus. Pellentesque vitae quam a erat aliquam convallis. Morbi in ullamcorper neque, accumsan vulputate neque.
        
        Maecenas metus diam, faucibus sed porta eget, scelerisque luctus orci. Quisque ac magna non eros auctor imperdiet sed ut nulla. Vestibulum vel ipsum pellentesque tellus egestas efficitur quis a nunc. Nam fermentum accumsan risus eu elementum. Fusce bibendum, arcu vel tempus efficitur, urna lacus aliquam risus, sed lobortis augue odio in ligula. Suspendisse vel turpis sit amet turpis mollis pulvinar. In vehicula rhoncus nisl, ut mollis ante porttitor a. Mauris sit amet erat hendrerit, ornare ex quis, maximus justo. Curabitur nec libero sed ipsum porta tincidunt nec et leo. Nulla consectetur massa id enim euismod, ac semper sem eleifend. Ut posuere pharetra libero eu pharetra. Fusce tincidunt leo volutpat est ornare molestie. Etiam ultricies pharetra dignissim. Aenean tincidunt commodo orci a ultrices. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam venenatis commodo velit.
        
        Nunc eget facilisis purus. Duis ligula libero, molestie vel lobortis id, rhoncus cursus ligula. Maecenas laoreet scelerisque rhoncus. Nunc porta mauris sed libero viverra, et dictum nulla euismod. Maecenas cursus ligula vel nisi tempus, vel sodales velit sodales. Morbi eleifend non elit vel laoreet. Ut volutpat congue massa, sed molestie lorem pellentesque at. Sed sed erat ac diam molestie laoreet nec a ante. Ut ac lorem at lacus facilisis interdum.
        
        Maecenas vitae ex vel felis commodo euismod vitae quis nunc. Nulla facilisi. Etiam bibendum, ex rutrum posuere suscipit, orci justo laoreet ex, ut pretium magna nisl at diam. Aliquam erat volutpat. Nunc libero tellus, feugiat et vestibulum scelerisque, ultrices sed lectus. Cras a suscipit justo. Duis tincidunt felis id sodales laoreet. Etiam ac elit id urna vestibulum efficitur. Vestibulum nec mattis lacus, et commodo odio.
        
        Duis orci lectus, bibendum sed orci nec, sodales facilisis nisi. Nunc accumsan urna elit, non interdum est porttitor et. Aliquam laoreet odio lectus, vel fringilla urna feugiat quis. Vestibulum sed dui quis enim facilisis posuere sit amet sed magna. Sed porttitor ligula eget dolor gravida commodo. Aliquam erat volutpat. Vestibulum feugiat ligula odio, nec placerat tellus maximus nec. Nunc eget arcu condimentum, convallis dolor vitae, hendrerit arcu. Proin massa nulla, rutrum consequat tincidunt sed, euismod quis metus. Nunc ac quam pulvinar, interdum tortor id, tincidunt massa. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Suspendisse neque libero, condimentum et auctor quis, accumsan a nisi. Aliquam pharetra dapibus lectus non ultrices. Phasellus ultrices nunc et pretium posuere.
        
        Quisque vehicula lacinia diam eu venenatis. Nunc ut molestie urna. Mauris sit amet vehicula lacus. Duis nunc quam, tempor non vulputate tempor, lacinia eget ligula. Aliquam erat volutpat. Maecenas lorem lectus, lobortis non lacus et, aliquet suscipit elit. Duis feugiat augue lacus, eu lobortis diam semper in. Nam mollis quis nibh ut imperdiet. Maecenas at arcu sit amet urna laoreet tincidunt. Suspendisse molestie auctor nisi, vitae mattis nunc cursus quis. In ac felis magna. Quisque bibendum risus id aliquam feugiat.
        
        Curabitur ac aliquet lorem. Donec eget efficitur sem. Nunc at congue tellus. Mauris scelerisque est et quam luctus congue. Phasellus aliquam elit eu ante ullamcorper, id pharetra odio auctor. Etiam nec erat orci. Etiam in turpis ligula. Maecenas consequat ante et eros maximus lacinia. Vivamus non sem rhoncus, congue sapien quis, condimentum elit. Ut porta elementum urna sed imperdiet. Etiam consectetur viverra nibh vitae maximus. Etiam et sagittis nunc, at mollis nulla. Vestibulum a nisl magna. Donec ut consectetur mi. Mauris a nulla sit amet arcu pretium pulvinar.
        
        Fusce quis lectus felis. Maecenas elementum sem felis, sit amet dictum augue cursus luctus. Quisque varius mollis ultrices. Vivamus nec velit at eros malesuada rhoncus. Mauris porttitor eleifend lorem, nec consequat enim accumsan ut. Sed mattis porttitor libero, ut rutrum nunc lacinia quis. Phasellus vel sem vehicula, venenatis lacus sed, scelerisque ex. Ut volutpat ex lacinia ligula consectetur, eu porttitor nibh tincidunt. Nullam mi sapien, laoreet eget neque ac, posuere volutpat lectus. Curabitur eu orci sem. Proin efficitur purus quis commodo dignissim. Nunc a sem sed quam ornare elementum. Morbi erat ipsum, consectetur et dui ac, suscipit tempus ipsum. Phasellus vehicula diam ipsum. Praesent magna libero, iaculis ut fringilla nec, consectetur vitae nulla. Aenean luctus in tellus sit amet placerat.
        
        Integer maximus sem eget tortor vehicula gravida. Morbi auctor, diam et consectetur lacinia, mi justo sollicitudin lorem, tincidunt dignissim turpis turpis ut tortor. Vivamus vitae tortor venenatis arcu facilisis ullamcorper. Maecenas pulvinar mauris a hendrerit mollis. Praesent nunc dui, ultricies pharetra quam et, iaculis porta nulla. Aenean nec congue sem. Nulla pulvinar elit at sem tempor, non viverra eros fermentum. Quisque non vestibulum metus. Aliquam interdum mi nec accumsan ultrices. Maecenas consectetur gravida pulvinar. Quisque venenatis sapien sit amet vehicula luctus. Aliquam rutrum sem odio, vel laoreet neque lobortis id. Nunc quis bibendum ante, convallis vehicula massa.
        
        Phasellus eu dapibus tellus, ut rutrum sapien. Nam pulvinar erat quis nisi ultrices interdum. Aliquam velit erat, tincidunt ac dictum sit amet, aliquet in erat. Nam finibus, arcu et dictum ultrices, lectus eros fringilla enim, eu luctus est sapien vel mi. Sed eget nulla leo. Cras feugiat eros quis eleifend feugiat. Praesent vel enim et neque pulvinar sollicitudin. Mauris posuere, purus in vehicula fringilla, quam nulla feugiat tortor, non tempor orci tellus consequat tellus. Proin consequat sapien in consequat ultrices. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Nullam eleifend dui non risus egestas dictum. Donec dignissim, nunc quis pulvinar euismod, nibh odio commodo arcu, in convallis turpis elit non justo. Pellentesque sodales ut nibh sed hendrerit. Ut venenatis urna eros, in efficitur nunc imperdiet at. Vivamus rhoncus nibh id orci semper, nec eleifend odio consectetur.
        
        Ut id ultricies mauris, nec cursus diam. Donec facilisis erat sed odio tincidunt accumsan. Aenean commodo feugiat pharetra. Quisque maximus nulla tellus, a tincidunt lacus porta vitae. Phasellus lobortis ligula sit amet pulvinar sollicitudin. Mauris non leo non tortor commodo sagittis eu at odio. Suspendisse tempus vehicula efficitur.
        
        In eros lorem, luctus eu orci at, sollicitudin molestie dui. Aenean blandit pellentesque aliquet. Cras nec convallis nisi, id pulvinar tortor. Donec vitae tortor at elit sagittis condimentum. In consequat gravida sem eu blandit. Aliquam nec fringilla magna, ac placerat arcu. Praesent imperdiet lacus ante, fringilla posuere augue viverra id. Duis justo risus, maximus eget est non, venenatis consequat eros. Nam sed placerat neque, ut sodales neque.
        
        Etiam aliquet eros est, non placerat augue elementum sit amet. Morbi tortor sapien, mattis non vehicula ac, finibus vel est. Nullam tempus ipsum lacus, quis consectetur magna iaculis at. Sed ac ex id mauris convallis rhoncus quis sed enim. Pellentesque iaculis ante in elit gravida, id bibendum ex dignissim. Integer facilisis elit rutrum est iaculis, in imperdiet est ornare. In tempus metus non est lacinia, sit amet consequat ex commodo. Sed quis nisl sem. Curabitur posuere nec lectus eget ultricies. Aenean eget porttitor nibh. Vestibulum a vulputate tellus. Phasellus tristique sapien vitae est malesuada vulputate.
        
        Nullam bibendum hendrerit libero et accumsan. Sed vitae diam eget justo mattis tincidunt. Integer volutpat purus justo, ut mattis ex euismod vel. Aenean eget tempus nisl porta ante.`
      )

      const uploadTimeEnd = performance.now()
      sendTiming('Contacts file', 'upload', uploadTimeEnd - uploadTimeStart)

      setIsCsvProcessing(true)
      setCsvInfo((info) => ({ ...info }))
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  // Hide csv error from previous upload and delete from db
  function clearCsvStatus() {
    if (campaignId) {
      setCsvInfo((info) => ({ ...info, csvError: undefined }))
      deleteCsvStatus(+campaignId)
    }
  }

  return (
    <>
      <sub>Step 2</sub>
      <h2>Upload recipient list in CSV format</h2>
      <p>
        Only CSV format files are allowed. If you have an Excel file, please
        convert it by going to File &gt; Save As &gt; CSV (Comma delimited).
      </p>
      <p>
        CSV file must include a <b>recipient</b> column with recipients&apos;
        email addresses
      </p>

      <CsvUpload
        isCsvProcessing={isCsvProcessing}
        csvInfo={csvInfo}
        onErrorClose={clearCsvStatus}
      >
        <FileInput isProcessing={isUploading} onFileSelected={uploadFile} />
        <p>or</p>
        <SampleCsv params={params} defaultRecipient="user@email.com" />
      </CsvUpload>

      <ErrorBlock>{errorMessage}</ErrorBlock>

      <div className="separator"></div>

      {!isCsvProcessing && numRecipients > 0 && (
        <>
          <p className={styles.greyText}>Message preview</p>
          <PreviewBlock
            body={preview?.body}
            subject={preview?.subject}
            replyTo={preview?.replyTo}
          />
          <div className="separator"></div>
        </>
      )}

      <div className="progress-button">
        <PrimaryButton
          disabled={!numRecipients || isCsvProcessing}
          onClick={onNext}
        >
          Preview →
        </PrimaryButton>
      </div>
    </>
  )
}

export default EmailRecipients

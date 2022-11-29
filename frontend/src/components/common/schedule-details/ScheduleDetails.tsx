import Moment from 'react-moment'

const ScheduleDetails = ({
  scheduledAt,
  messageNumber,
}: {
  scheduledAt: Date
  messageNumber: number
}) => {
  return (
    <table>
      <thead>
        <tr>
          <th className={'md'}>Scheduled date</th>
          <th className={'md'}>Total messages</th>
          <th className={'sm'}>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={'md'}>
            <Moment format="MMM DD YYYY, HH:mm" interval={0}>
              {scheduledAt}
            </Moment>
          </td>

          <td className={'md'}>{messageNumber}</td>
          <td className={'sm'}>Scheduled</td>
        </tr>
      </tbody>
    </table>
  )
}

export default ScheduleDetails

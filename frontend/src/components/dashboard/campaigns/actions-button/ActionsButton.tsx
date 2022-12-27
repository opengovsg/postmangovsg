import { Trans } from '@lingui/macro'
import cx from 'classnames'
import {
  createRef,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useState,
} from 'react'

import styles from './ActionsButton.module.scss'

import { Campaign, ChannelType, Status } from 'classes'

import { ExportRecipients } from 'components/common'
import DuplicateCampaignModal from 'components/dashboard/create/duplicate-campaign-modal'
import CreateDemoModal from 'components/dashboard/demo/create-demo-modal'

import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

const ActionsButton = ({
  campaign,
  numDemosSms,
  numDemosTelegram,
  modalContext,
  isMenuOpen,
  onToggle,
  onDelete,
  onClose,
  onRename,
  onReschedule,
}: {
  campaign: Campaign
  numDemosSms: number
  numDemosTelegram: number
  modalContext: any
  isMenuOpen?: boolean
  onToggle?: (e: ReactMouseEvent<HTMLButtonElement> | MouseEvent) => void
  onDelete?: (e: ReactMouseEvent<HTMLButtonElement | HTMLDivElement>) => void
  onClose?: () => void
  onRename?: (e: ReactMouseEvent<HTMLButtonElement | HTMLDivElement>) => void
  onReschedule?: (
    e: ReactMouseEvent<HTMLButtonElement | HTMLDivElement>
  ) => void
}) => {
  const btnGroupRef = createRef<HTMLDivElement>()
  const [dropdownMenuStyle, setDropdownMenuStyle] = useState<object>()
  const menuRef = createRef<HTMLDivElement>()

  const isDuplicateDisabled =
    campaign.demoMessageLimit &&
    ((numDemosSms === 0 && campaign.type === ChannelType.SMS) ||
      (numDemosTelegram === 0 && campaign.type === ChannelType.Telegram))

  function recalculateMenuStyle(): void {
    if (!btnGroupRef.current) return
    const btnGroupPosition = btnGroupRef.current?.getBoundingClientRect()
    setDropdownMenuStyle({
      top: `${
        (btnGroupPosition?.top as number) +
        (btnGroupRef.current?.offsetHeight as number) +
        4
      }px`,
      right: `${window.innerWidth - (btnGroupPosition?.right as number)}px`,
    })
  }

  useEffect(() => {
    window.addEventListener('resize', recalculateMenuStyle)
    window.addEventListener('scroll', recalculateMenuStyle)
    return () => {
      window.removeEventListener('resize', recalculateMenuStyle)
      window.removeEventListener('scroll', recalculateMenuStyle)
    }
  })

  function handleToggle(e: ReactMouseEvent<HTMLButtonElement>): void {
    recalculateMenuStyle()
    if (onToggle) {
      onToggle(e)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): any {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !btnGroupRef.current?.contains(event.target as Node) &&
        onClose
      ) {
        onClose()
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [menuRef, btnGroupRef, onClose])

  return (
    <div className={styles.btnGroup} ref={btnGroupRef}>
      <button
        className={cx(styles.btnGroupBtn, styles.btnGroupLeft, {
          [styles.colorDisabled]: isDuplicateDisabled,
        })}
        onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
          event.stopPropagation()
          if (isDuplicateDisabled) return
          sendUserEvent(GA_USER_EVENTS.OPEN_DUPLICATE_MODAL, campaign.type)
          const modal = campaign.demoMessageLimit ? (
            <CreateDemoModal
              duplicateCampaign={{
                name: campaign.name,
                type: campaign.type,
              }}
              numDemosSms={numDemosSms}
              numDemosTelegram={numDemosTelegram}
            />
          ) : (
            <DuplicateCampaignModal campaign={campaign} />
          )
          modalContext.setModalContent(modal)
        }}
        disabled={isDuplicateDisabled as boolean}
      >
        <span>Duplicate</span>
        <i
          className={cx(styles.bxBlue, 'bx bx-duplicate', {
            [styles.colorDisabled]: isDuplicateDisabled,
          })}
        ></i>
      </button>
      <button
        className={cx(styles.btnGroupBtn, styles.btnGroupRight)}
        onClick={handleToggle}
      >
        <i className="bx bx-chevron-down"></i>
      </button>
      <div
        className={cx(styles.dropdownMenu, {
          [styles.displayNone]: !isMenuOpen,
        })}
        style={dropdownMenuStyle}
        ref={menuRef}
      >
        {campaign.status === Status.Scheduled && (
          <div className={styles.dropdownItem} onClick={onReschedule}>
            <button className={cx(styles.btn, styles.btnPrimary)}>
              Reschedule or cancel <i className="bx bx-calendar-event"></i>
            </button>
          </div>
        )}
        {campaign.redacted ? (
          <span
            className={styles.expired}
            onClick={(e: ReactMouseEvent<HTMLSpanElement>) =>
              e.stopPropagation()
            }
          >
            <Trans>Report expired</Trans>
          </span>
        ) : (
          <div className={styles.dropdownItem}>
            <ExportRecipients
              iconPosition="right"
              campaignId={campaign.id}
              campaignName={campaign.name}
              campaignType={campaign.type}
              sentAt={campaign.sentAt}
              status={campaign.status}
              statusUpdatedAt={campaign.statusUpdatedAt}
            />
          </div>
        )}
        {onRename ? (
          <div className={styles.dropdownItem} onClick={onRename}>
            <button className={cx(styles.btn, styles.btnPrimary)}>
              Rename <i className="bx bx-pencil"></i>
            </button>
          </div>
        ) : (
          ''
        )}
        {onDelete ? (
          <div className={styles.dropdownItem} onClick={onDelete}>
            <button className={cx(styles.btn, styles.btnDanger)}>
              Delete <i className="bx bx-trash"></i>
            </button>
          </div>
        ) : (
          ''
        )}
      </div>
    </div>
  )
}

export default ActionsButton

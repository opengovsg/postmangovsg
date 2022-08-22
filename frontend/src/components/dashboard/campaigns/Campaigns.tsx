import cx from 'classnames'

import { capitalize } from 'lodash'

import {
  useEffect,
  useState,
  useContext,
  useCallback,
  MouseEvent as ReactMouseEvent,
  useRef,
} from 'react'

import Moment from 'react-moment'

import { Link } from 'react-router-dom'

import styles from './Campaigns.module.scss'
import overrideStyles from './OverrideTextInputWithButton.module.scss'

import ActionsButton from './actions-button'

import AnnouncementModal from './announcement-modal'

import EmptyDashboardImg from 'assets/img/empty-dashboard.png'
import { Campaign, channelIcons } from 'classes'
import {
  Pagination,
  TitleBar,
  PrimaryButton,
  ConfirmModal,
  TextInputWithButton,
} from 'components/common'
import useIsMounted from 'components/custom-hooks/use-is-mounted'
import CreateCampaign from 'components/dashboard/create/create-modal'
import CreateDemoModal from 'components/dashboard/demo/create-demo-modal'
import DemoBar from 'components/dashboard/demo/demo-bar/DemoBar'
import { ANNOUNCEMENT, getAnnouncementVersion } from 'config'
import { AuthContext } from 'contexts/auth.context'
import { ModalContext } from 'contexts/modal.context'

import {
  deleteCampaignById,
  getCampaigns,
  renameCampaign,
} from 'services/campaign.service'
import { GA_USER_EVENTS, sendUserEvent } from 'services/ga.service'

import { getUserSettings } from 'services/settings.service'

const ITEMS_PER_PAGE = 10

const Campaigns = () => {
  const isMounted = useIsMounted()
  const { email } = useContext(AuthContext)
  const modalContext = useContext(ModalContext)
  const [isLoading, setLoading] = useState(true)
  const [campaignsDisplayed, setCampaignsDisplayed] = useState(
    new Array<Campaign>()
  )
  const [selectedPage, setSelectedPage] = useState(0)
  const [campaignCount, setCampaignCount] = useState(0)
  const [isDemoDisplayed, setIsDemoDisplayed] = useState(false)
  const [numDemosSms, setNumDemosSms] = useState(0)
  const [numDemosTelegram, setNumDemosTelegram] = useState(0)
  const [campaignIdWithMenuOpen, setCampaignIdWithMenuOpen] = useState<
    number | undefined
  >(undefined)
  const [campaignIdWithRenameOpen, setCampaignIdWithRenameOpen] = useState<
    number | undefined
  >(undefined)
  const [campaignNewName, setCampaignNewName] = useState('')
  const renameInputRef = useRef<HTMLInputElement>()

  const name = getNameFromEmail(email)
  const title = `Welcome, ${name}`

  function getNameFromEmail(email: string): string {
    const parts = email.split('@')
    const [nameParts] = parts
    return nameParts
      .split(/[_.-]/)
      .map((n) => capitalize(n))
      .join(' ')
  }

  async function fetchCampaigns(selectedPage: number) {
    setLoading(true)
    const { campaigns, totalCount } = await getCampaigns({
      offset: selectedPage * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
    })
    setCampaignCount(totalCount)
    setCampaignsDisplayed(campaigns)
    setLoading(false)
  }

  function toggleMenu(campaignId: number): void {
    if (campaignId === campaignIdWithMenuOpen) {
      setCampaignIdWithMenuOpen(undefined)
      return
    }
    setCampaignIdWithMenuOpen(campaignId)
  }

  function closeMenu(): void {
    setCampaignIdWithMenuOpen(undefined)
  }

  const deleteCampaign = useCallback(
    async (campaignId: number) => {
      await deleteCampaignById(campaignId)
      setCampaignCount(campaignCount - 1)
      setCampaignsDisplayed(
        campaignsDisplayed.filter((c) => c.id !== campaignId)
      )
    },
    [setCampaignCount, setCampaignsDisplayed, campaignCount, campaignsDisplayed]
  )
  const promptDeleteConfirmation = useCallback(
    (campaignId: number) => {
      if (modalContext.modalContent === null) {
        modalContext.setModalContent(
          <ConfirmModal
            title="Are you absolutely sure?"
            subtitle="Deleting a campaign is irreversible."
            buttonText="Yes"
            cancelText="Cancel"
            onConfirm={() => deleteCampaign(campaignId)}
            disableImage
            destructive
          />
        )
      }
    },
    [modalContext, deleteCampaign]
  )

  async function handleRename(): Promise<void> {
    await renameCampaign(campaignIdWithRenameOpen as number, campaignNewName)
    setCampaignsDisplayed(
      campaignsDisplayed.map((c) => {
        if (c.id === campaignIdWithRenameOpen) {
          c.name = campaignNewName
        }
        return c
      })
    )
    setCampaignIdWithRenameOpen(undefined)
  }

  // Only call the modalContext if content is currently null - prevents infinite re-rendering
  // Note that this triggers unnecessary network calls because useCallback evaluates the function being passed in
  const displayNewAnnouncement = useCallback(
    (lastSeenVersion: string, currentVersion: string) => {
      if (
        ANNOUNCEMENT.isActive &&
        lastSeenVersion !== currentVersion &&
        modalContext.modalContent === null
      ) {
        modalContext.setModalContent(<AnnouncementModal />)
      }
    },
    [modalContext]
  )

  useEffect(() => {
    void fetchCampaigns(selectedPage)
  }, [selectedPage])

  useEffect(() => {
    // TODO: refactor out num demos processing
    async function getNumDemosAndAnnouncementVersion() {
      const { demo, announcementVersion } = await getUserSettings()
      const latestAnnouncementVersion = await getAnnouncementVersion()

      if (!isMounted.current) {
        return
      }

      setIsDemoDisplayed(demo?.isDisplayed)
      setNumDemosSms(demo?.numDemosSms)
      setNumDemosTelegram(demo?.numDemosTelegram)
      displayNewAnnouncement(announcementVersion, latestAnnouncementVersion)
    }
    void getNumDemosAndAnnouncementVersion()
  }, [displayNewAnnouncement, isMounted])

  useEffect(() => {
    if (!campaignIdWithRenameOpen) return
    renameInputRef.current?.focus()
  }, [campaignIdWithRenameOpen])

  /* eslint-disable react/display-name */
  const headers = [
    {
      name: 'Mode',
      render: (campaign: Campaign) => (
        <div className={styles.iconContainer}>
          <i
            className={cx(
              'bx',
              styles.icon,
              styles.mode,
              channelIcons[campaign.type]
            )}
          ></i>
          {campaign.protect && (
            <i className={cx('bx bxs-lock-alt', styles.lockIcon)}></i>
          )}
        </div>
      ),
      width: 'xs center',
    },
    {
      name: 'Name',
      render: (campaign: Campaign) =>
        campaignIdWithRenameOpen === campaign.id ? (
          <TextInputWithButton
            value={campaignNewName || campaign.name}
            type="text"
            placeholder="Enter new name"
            onChange={setCampaignNewName}
            onClick={handleRename}
            buttonLabel={<i className={cx('bx bx-check', overrideStyles.bx)} />}
            loadingButtonLabel={<i className="bx bx-loader-alt bx-spin" />}
            overrideStyles={overrideStyles}
            textRef={renameInputRef}
          />
        ) : (
          <span
            className={cx(styles.rowName, {
              [styles.demo]: !!campaign.demoMessageLimit,
            })}
          >
            <Link to={`/campaigns/${campaign.id}`}>{campaign.name}</Link>
          </span>
        ),
      width: 'lg ellipsis',
    },
    {
      name: 'Created At',
      render: (campaign: Campaign) => (
        <Moment format="MMM DD YYYY, HH:mm" interval={0}>
          {campaign.createdAt}
        </Moment>
      ),
      width: 'md',
    },
    {
      name: 'Sent At',
      render: (campaign: Campaign) =>
        campaign.sentAt ? (
          <Moment format="MMM DD YYYY, HH:mm" interval={0}>
            {campaign.sentAt}
          </Moment>
        ) : (
          <span></span>
        ),
      width: 'md',
    },
    {
      name: 'Status',
      render: (campaign: Campaign) => capitalize(campaign.status),
      width: 'xs center',
    },
    {
      name: '',
      render: (campaign: Campaign) => {
        return (
          <ActionsButton
            campaign={campaign}
            numDemosSms={numDemosSms}
            numDemosTelegram={numDemosTelegram}
            modalContext={modalContext}
            isMenuOpen={campaign.id === campaignIdWithMenuOpen}
            onToggle={(e: ReactMouseEvent<HTMLButtonElement> | MouseEvent) => {
              e.stopPropagation()
              toggleMenu(campaign.id)
            }}
            onDelete={(
              e: ReactMouseEvent<HTMLButtonElement | HTMLDivElement>
            ) => {
              e.stopPropagation()
              promptDeleteConfirmation(campaign.id)
            }}
            onClose={closeMenu}
            onRename={(
              e: ReactMouseEvent<HTMLButtonElement | HTMLDivElement>
            ) => {
              e.stopPropagation()
              setCampaignIdWithRenameOpen(campaign.id)
              closeMenu()
            }}
          />
        )
      },
      width: 'sm center',
    },
  ]
  /* eslint-enable react/display-name */

  function renderRow(campaign: Campaign, key: number) {
    return (
      <tr key={key}>
        {headers.map(({ render, width }, key) => (
          <td className={width} key={key}>
            {render(campaign)}
          </td>
        ))}
      </tr>
    )
  }

  function renderEmptyDashboard() {
    return (
      <div className={styles.emptyDashboard}>
        <img
          className={styles.image}
          src={EmptyDashboardImg}
          alt="Empty dashboard graphic"
        />
        <h2>We are excited to have you here!</h2>
        <p>There are 3 channels for you to try: Email, SMS and Telegram.</p>
        <p>
          Email is always free and no set up is required. Since Telegram and SMS
          requires more set-up, you can now try them out using demo campaigns to
          see how they work.
        </p>
        <div className={styles.actions}>
          <PrimaryButton
            onClick={() => {
              sendUserEvent(GA_USER_EVENTS.NEW_USER_TRY_EMAIL)
              modalContext.setModalContent(<CreateCampaign />)
            }}
          >
            Try email campaign
          </PrimaryButton>
          <PrimaryButton
            className={styles.darkGreenButton}
            onClick={() => {
              sendUserEvent(GA_USER_EVENTS.NEW_USER_TRY_SMS_TELEGRAM)
              modalContext.setModalContent(
                <CreateDemoModal
                  numDemosSms={numDemosSms}
                  numDemosTelegram={numDemosTelegram}
                />
              )
            }}
          >
            Try demo SMS/Telegram
          </PrimaryButton>
        </div>
      </div>
    )
  }

  function renderCampaignList() {
    return (
      <>
        <h2 className={styles.header}>{campaignCount} past campaigns</h2>
        <div className={styles.tableContainer}>
          <table className={styles.campaignTable}>
            <thead>
              <tr>
                {headers.map(({ name, width }, key) => (
                  <th className={width} key={key}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{campaignsDisplayed.map(renderRow)}</tbody>
          </table>
        </div>

        <Pagination
          itemsCount={campaignCount}
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
          itemsPerPage={ITEMS_PER_PAGE}
        ></Pagination>
      </>
    )
  }

  return (
    <>
      <TitleBar title={title}>
        <PrimaryButton
          onClick={() =>
            modalContext.setModalContent(<CreateCampaign></CreateCampaign>)
          }
        >
          Create new campaign
        </PrimaryButton>
      </TitleBar>
      {campaignCount > 0 && (
        <DemoBar
          numDemosSms={numDemosSms}
          numDemosTelegram={numDemosTelegram}
          isDisplayed={isDemoDisplayed}
        />
      )}
      <div className={styles.content}>
        {isLoading ? (
          <i className={cx(styles.spinner, 'bx bx-loader-alt bx-spin')} />
        ) : campaignCount > 0 ? (
          renderCampaignList()
        ) : (
          renderEmptyDashboard()
        )}
      </div>
    </>
  )
}

export default Campaigns

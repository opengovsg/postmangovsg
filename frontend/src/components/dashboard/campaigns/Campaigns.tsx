import cx from 'classnames'

import { capitalize, debounce } from 'lodash'

import {
  useEffect,
  useState,
  useContext,
  useCallback,
  MouseEvent as ReactMouseEvent,
  useRef,
  useMemo,
} from 'react'

import Moment from 'react-moment'

import { Link } from 'react-router-dom'

import styles from './Campaigns.module.scss'
import overrideStylesTextButton from './OverrideTextButton.module.scss'
import overrideStylesTextInput from './OverrideTextInput.module.scss'
import overrideStylesTextInputWithButton from './OverrideTextInputWithButton.module.scss'
import overrideStylesTitleBar from './OverrideTitleBar.module.scss'

import ActionsButton from './actions-button'

import AnnouncementModal from './announcement-modal'

import DropdownFilter from './dropdown-filter'

import EmptyDashboardImg from 'assets/img/empty-dashboard.png'
import NoMatchDashboardImg from 'assets/img/no-match-dashboard.png'
import {
  Campaign,
  channelIcons,
  SortField,
  Ordering,
  ChannelType,
  StatusFilter,
} from 'classes'
import {
  Pagination,
  TitleBar,
  PrimaryButton,
  ConfirmModal,
  TextInputWithButton,
  TextButton,
  TextInput,
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
  const [isSearching, setSearching] = useState(true)
  const [campaignsDisplayed, setCampaignsDisplayed] = useState(
    new Array<Campaign>()
  )
  const [selectedPage, setSelectedPage] = useState(0)
  const [campaignCount, setCampaignCount] = useState(-1)
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

  const filterInit = 'All'
  const searchInit = ''
  const [createdOrder, setCreatedOrder] = useState(Ordering.DESC)
  const [sentOrder, setSentOrder] = useState(Ordering.DESC)
  const [sortBy, setSortBy] = useState(SortField.Created)
  const [orderBy, setOrderBy] = useState(Ordering.DESC)
  const [statusFilter, setStatusFilter] = useState<
    StatusFilter | typeof filterInit
  >(filterInit)
  const [modeFilter, setModeFilter] = useState<ChannelType | typeof filterInit>(
    filterInit
  )
  const [nameFilter, setNameFilter] = useState(searchInit)

  function getNameFromEmail(email: string): string {
    const parts = email.split('@')
    const [nameParts] = parts
    return nameParts
      .split(/[_.-]/)
      .map((n) => capitalize(n))
      .join(' ')
  }

  function CamelCaseWord(word: string): string {
    return word.charAt(0) + word.slice(1).toLowerCase()
  }

  async function fetchCampaigns(
    selectedPage: number,
    sort_by: SortField,
    order_by: Ordering,
    statusFilter: StatusFilter | typeof filterInit,
    modeFilter: ChannelType | typeof filterInit,
    nameFilter: string
  ) {
    setSearching(true)
    let options = {
      offset: selectedPage * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
      sort_by: sort_by,
      order_by: order_by,
    }
    if (statusFilter !== filterInit) {
      options = { ...options, ...{ status: statusFilter as StatusFilter } }
    }
    if (modeFilter !== filterInit) {
      options = { ...options, ...{ type: modeFilter as ChannelType } }
    }
    if (nameFilter !== searchInit) {
      options = { ...options, ...{ name: nameFilter } }
    }
    const { campaigns, totalCount } = await getCampaigns(options)
    setCampaignCount(totalCount)
    setCampaignsDisplayed(campaigns)
    setSearching(false)
    setSelectedPage(selectedPage)
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

  //initial fetch to load page
  useEffect(() => {
    void fetchCampaigns(
      selectedPage,
      sortBy,
      orderBy,
      statusFilter,
      modeFilter,
      nameFilter
    )
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

  function handleCreatedAtHeader() {
    const newOrder =
      createdOrder === Ordering.DESC ? Ordering.ASC : Ordering.DESC
    const newSort = SortField.Created
    setCreatedOrder(newOrder)
    setOrderBy(newOrder)
    setSortBy(newSort)
    fetchCampaigns(0, newSort, newOrder, statusFilter, modeFilter, nameFilter)
  }

  function handleSentAtHeader() {
    const newOrder = sentOrder === Ordering.DESC ? Ordering.ASC : Ordering.DESC
    const newSort = SortField.Sent
    setSentOrder(newOrder)
    setOrderBy(newOrder)
    setSortBy(newSort)
    fetchCampaigns(0, newSort, newOrder, statusFilter, modeFilter, nameFilter)
  }

  function handleStatusFilter(status: StatusFilter | typeof filterInit) {
    setStatusFilter(status)
    fetchCampaigns(0, sortBy, orderBy, status, modeFilter, nameFilter)
  }

  function handleModeFilter(mode: ChannelType | typeof filterInit) {
    setModeFilter(mode)
    fetchCampaigns(0, sortBy, orderBy, statusFilter, mode, nameFilter)
  }

  function handlePageChange(index: number) {
    fetchCampaigns(index, sortBy, orderBy, statusFilter, modeFilter, nameFilter)
  }

  const debouncedChangeHandler = useMemo(
    () => debounce(fetchCampaigns, 300),
    []
  )

  function handleNameSearch(newFilter: string) {
    setNameFilter(newFilter)
    // set isSearching to true upon input even though actual search is debounced
    // this is to prevent UI from jumping to no matches found too early
    setSearching(true)
    debouncedChangeHandler(
      0,
      sortBy,
      orderBy,
      statusFilter,
      modeFilter,
      newFilter
    )
  }

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
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          <DropdownFilter
            onSelect={handleModeFilter}
            options={[filterInit, ...Object.values(ChannelType)].map((opt) => ({
              label: CamelCaseWord(opt),
              value: opt,
            }))}
            defaultLabel={
              modeFilter === filterInit ? name : CamelCaseWord(modeFilter)
            }
            aria-label={name}
          ></DropdownFilter>
        </th>
      ),
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
            buttonLabel={
              <i
                className={cx(
                  'bx bx-check',
                  overrideStylesTextInputWithButton.bx
                )}
              />
            }
            loadingButtonLabel={<i className="bx bx-loader-alt bx-spin" />}
            overrideStyles={overrideStylesTextInputWithButton}
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
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          {name}
        </th>
      ),
    },
    {
      name: 'Created At',
      render: (campaign: Campaign) => (
        <Moment format="MMM DD YYYY, HH:mm" interval={0}>
          {campaign.createdAt}
        </Moment>
      ),
      width: 'md',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          <TextButton
            noUnderline
            className={width}
            onClick={handleCreatedAtHeader}
            overrideStyles={overrideStylesTextButton}
          >
            {name}
            {createdOrder === Ordering.ASC ? (
              <i className={cx('bx bx-up-arrow-alt', styles.i)} />
            ) : (
              <i className={cx('bx bx-down-arrow-alt', styles.i)} />
            )}
          </TextButton>
        </th>
      ),
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
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          <TextButton
            noUnderline
            className={width}
            onClick={handleSentAtHeader}
            overrideStyles={overrideStylesTextButton}
          >
            {name}
            {sentOrder === Ordering.ASC ? (
              <i className={cx('bx bx-up-arrow-alt', styles.i)} />
            ) : (
              <i className={cx('bx bx-down-arrow-alt', styles.i)} />
            )}
          </TextButton>
        </th>
      ),
    },
    {
      name: 'Status',
      render: (campaign: Campaign) => capitalize(campaign.status),
      width: 'xs',
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          <DropdownFilter
            onSelect={handleStatusFilter}
            options={[filterInit, ...Object.values(StatusFilter)].map(
              (opt) => ({
                label: opt,
                value: opt,
              })
            )}
            defaultLabel={statusFilter === filterInit ? name : statusFilter}
            aria-label={name}
          ></DropdownFilter>
        </th>
      ),
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
      renderHeader: (name: string, width: string, key: number) => (
        <th className={width} key={key}>
          <span className={styles.buttonSpace}>{name}</span>
        </th>
      ),
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

  function renderCampaignList() {
    return (
      <>
        <tbody>{campaignsDisplayed.map(renderRow)}</tbody>
      </>
    )
  }

  function renderEmptyDashboard() {
    return (
      <div className={styles.content}>
        <div className={styles.emptyDashboard}>
          <img
            className={styles.image}
            src={EmptyDashboardImg}
            alt="Empty dashboard graphic"
          />
          <h2>We are excited to have you here!</h2>
          <p>There are 3 channels for you to try: Email, SMS and Telegram.</p>
          <p>
            Email is always free and no set up is required. Since Telegram and
            SMS requires more set-up, you can now try them out using demo
            campaigns to see how they work.
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
      </div>
    )
  }

  function renderNoMatch() {
    return (
      <div className={styles.content}>
        <div className={styles.emptyDashboard}>
          <img
            className={styles.image}
            src={NoMatchDashboardImg}
            alt="Empty dashboard graphic"
          />
          <h3>Sorry, no matches found</h3>
          <p>
            Search a new word or{' '}
            <Link
              to={`/campaigns`}
              className={styles.linkUnderline}
              onClick={() => window.location.reload()}
            >
              go back to campaign list
            </Link>
          </p>
        </div>
      </div>
    )
  }

  function renderPagination() {
    return (
      <>
        <Pagination
          itemsCount={campaignCount}
          selectedPage={campaignCount ? selectedPage : -1}
          setSelectedPage={handlePageChange}
          itemsPerPage={ITEMS_PER_PAGE}
        ></Pagination>
      </>
    )
  }

  function renderCampaign() {
    return (
      <>
        <DemoBar
          numDemosSms={numDemosSms}
          numDemosTelegram={numDemosTelegram}
          isDisplayed={isDemoDisplayed}
        />
        <div className={styles.content}>
          <TitleBar
            title={campaignCount + ' past campaigns'}
            overrideStyles={overrideStylesTitleBar}
          >
            <TextInput
              value={nameFilter}
              type="text"
              placeholder="Search for a campaign"
              onChange={handleNameSearch}
              iconLabel={
                <i
                  className={cx('bx bx-search', overrideStylesTextInput.icon)}
                />
              }
              overrideStyles={overrideStylesTextInput}
            />
          </TitleBar>
          <div className={styles.tableContainer}>
            <table className={styles.campaignTable}>
              <thead>
                <tr>
                  {headers.map(({ name, width, renderHeader }, key) =>
                    renderHeader(name, width, key)
                  )}
                </tr>
              </thead>
              {campaignCount > 0 ? renderCampaignList() : <></>}
            </table>
          </div>
          {campaignCount > 0 ? renderPagination() : renderNoMatch()}
        </div>
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
      {campaignCount < 0 ? (
        <i className={cx(styles.spinner, 'bx bx-loader-alt bx-spin')} />
      ) : isSearching ||
        campaignCount > 0 ||
        nameFilter !== searchInit ||
        statusFilter !== filterInit ||
        modeFilter !== filterInit ? (
        renderCampaign()
      ) : (
        renderEmptyDashboard()
      )}
    </>
  )
}

export default Campaigns

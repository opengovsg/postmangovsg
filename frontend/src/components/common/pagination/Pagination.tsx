import React from 'react'
import ReactPaginate from 'react-paginate'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import styles from './Pagination.module.scss'

const PAGE_RANGE_DISPLAYED = 5 // range of pages displayed
const MARGIN_PAGES_DISPLAYED = 2 // number of pages displayed after ellipse

const Pagination = (props: any) => {
  const { itemsCount, setSelectedPage, itemsPerPage } = props

  const pageCount = itemsCount / itemsPerPage

  const previousButton = (
    <span className={styles.icon}>
      <FontAwesomeIcon icon={faChevronLeft} />
    </span>
  )

  const nextButton = (
    <span className={styles.icon}>
      <FontAwesomeIcon icon={faChevronRight} />
    </span>
  )

  const handlePageClick = (data: any) => {
    // page index starts from 0
    setSelectedPage(data.selected)
  }

  return (
    <ReactPaginate
      previousLabel={previousButton}
      nextLabel={nextButton}
      breakLabel={'...'}
      pageCount={pageCount}
      marginPagesDisplayed={MARGIN_PAGES_DISPLAYED}
      pageRangeDisplayed={PAGE_RANGE_DISPLAYED}
      onPageChange={handlePageClick}
      containerClassName={styles.pagination}
      pageClassName={styles.pageNumber}
      breakClassName={styles.break}
      activeClassName={styles.active}
      activeLinkClassName	={styles.activeLink}
      previousClassName={styles.navIcon}
      nextClassName={styles.navIcon}
      disabledClassName={styles.navIconDisabled}
    />
  )
}

export default Pagination
import React from 'react'
import ReactPaginate from 'react-paginate'

import styles from './Pagination.module.scss'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

const DEFAULT_ITEMS_PER_PAGE = 1
const PAGE_RANGE_DISPLAYED = 5
const MARGIN_PAGES_DISPLAYED = 2 // number of pages displayed after ellipse

const Pagination = (props: any) => {

  const { itemsCount, limit } = props

  const itemsPerPage = limit || DEFAULT_ITEMS_PER_PAGE
  const pageCount = itemsCount / itemsPerPage

  const previousButton = (
    <span className="icon">
      <FontAwesomeIcon icon={faChevronLeft} />
    </span>
  )

  const nextButton = (
    <span className="icon">
      <FontAwesomeIcon icon={faChevronRight} />
    </span>
  )

  const handlePageClick = (data: any) => {
    const selected = data.selected;
    // TODO: save current page to state which will trigger
    // updated of displyed items in campaign list
  };

  return (
    <React.Fragment>      
      
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

    </React.Fragment>
  )
}

export default Pagination
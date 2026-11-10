// Lists that take an optional page: without one, every row comes back as a
// single page, which keeps pickers and lookups working off the same query.

/** Rows to skip for the requested page; an unpaged list starts at the top. */
export const pageOffset = (page: number | undefined, limit: number) =>
  page ? (page - 1) * limit : 0;

/** Pagination details for a page of `shown` rows out of `total`. */
export const buildPagination = ({
  page,
  limit,
  total,
  shown,
}: {
  page: number | undefined;
  limit: number;
  total: number;
  shown: number;
}) => {
  const pageSize = page ? limit : Math.max(total, 1);

  return {
    page: page ?? 1,
    limit: pageSize,
    total,
    hasMore: pageOffset(page, limit) + shown < total,
    totalPages: Math.ceil(total / pageSize),
  };
};

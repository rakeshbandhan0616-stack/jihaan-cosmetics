import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  LoaderCircle,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import "./ContactUsManager.css";

type ContactStatus = "new" | "read" | "replied" | "closed";

type ContactUser = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
};

type ContactMessage = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: ContactStatus;
  adminReply?: string;
  repliedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: ContactUser | null;
  repliedBy?: ContactUser | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type ContactListResponse = {
  success?: boolean;
  message?: string;
  contacts?: ContactMessage[];
  data?: ContactMessage[];
  pagination?: Pagination;
};

type ContactSingleResponse = {
  success?: boolean;
  message?: string;
  contact?: ContactMessage;
  data?: ContactMessage;
};

type ContactStats = {
  total?: number;
  new?: number;
  read?: number;
  replied?: number;
  closed?: number;
};

type ContactStatsResponse = {
  success?: boolean;
  message?: string;
  stats?: ContactStats;
  data?: ContactStats;
};

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const getAuthToken = (): string => {
  const adminToken = localStorage.getItem("adminToken");

  if (adminToken) {
    return adminToken;
  }

  const jihaanToken = localStorage.getItem("jihaan_auth_token");

  if (jihaanToken) {
    return jihaanToken;
  }

  const token = localStorage.getItem("token");

  return token || "";
};

const getHeaders = (): HeadersInit => {
  const token = getAuthToken();

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseResponse = async <T,>(response: Response): Promise<T> => {
  const responseText = await response.text();

  let parsedData: unknown = {};

  if (responseText) {
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        message: responseText,
      };
    }
  }

  if (!response.ok) {
    const errorData = parsedData as {
      message?: string;
      currentRole?: string;
    };

    const roleMessage = errorData.currentRole
      ? ` Current user role: ${errorData.currentRole}.`
      : "";

    throw new Error(
      `${errorData.message || `Request failed with status ${response.status}`}${roleMessage} Server responded with status ${response.status}.`,
    );
  }

  return parsedData as T;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};

const formatDate = (dateValue?: string | null): string => {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatShortDate = (dateValue?: string | null): string => {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusLabel = (status: ContactStatus): string => {
  const labels: Record<ContactStatus, string> = {
    new: "New",
    read: "Read",
    replied: "Replied",
    closed: "Closed",
  };

  return labels[status];
};

const getStatusClassName = (status: ContactStatus): string => {
  return `statusBadge status-${status}`;
};

const getContactId = (contact: ContactMessage): string => {
  return contact._id;
};

const getUserName = (contact: ContactMessage): string => {
  return contact.user?.name || contact.name || "Unknown user";
};

const getUserEmail = (contact: ContactMessage): string => {
  return contact.user?.email || contact.email || "No email";
};

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const ContactUsManager = () => {
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [selectedContact, setSelectedContact] =
    useState<ContactMessage | null>(null);

  const [stats, setStats] = useState<ContactStats>({
    total: 0,
    new: 0,
    read: 0,
    replied: 0,
    closed: 0,
  });

  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContactStatus>(
    "all",
  );

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  const [replyText, setReplyText] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<ContactStatus>("read");

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState("");

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/contact/stats`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );

      const result = await parseResponse<ContactStatsResponse>(response);

      const responseStats = result.stats || result.data || {};

      setStats({
        total: Number(responseStats.total || 0),
        new: Number(responseStats.new || 0),
        read: Number(responseStats.read || 0),
        replied: Number(responseStats.replied || 0),
        closed: Number(responseStats.closed || 0),
      });
    } catch (fetchError) {
      console.error("Contact stats error:", fetchError);
      setStatsError(getErrorMessage(fetchError));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const queryParams = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      if (appliedSearch.trim()) {
        queryParams.set("search", appliedSearch.trim());
      }

      if (statusFilter !== "all") {
        queryParams.set("status", statusFilter);
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/contact?${queryParams.toString()}`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );

      const result = await parseResponse<ContactListResponse>(response);

      const receivedContacts = result.contacts || result.data || [];

      setContacts(receivedContacts);

      if (result.pagination) {
        setPagination((previousPagination) => ({
          ...previousPagination,
          ...result.pagination,
          page: Number(result.pagination?.page || previousPagination.page),
          limit: Number(
            result.pagination?.limit || previousPagination.limit,
          ),
          total: Number(result.pagination?.total || 0),
          pages: Math.max(Number(result.pagination?.pages || 1), 1),
        }));
      } else {
        setPagination((previousPagination) => ({
          ...previousPagination,
          total: receivedContacts.length,
          pages: Math.max(
            Math.ceil(receivedContacts.length / previousPagination.limit),
            1,
          ),
        }));
      }
    } catch (fetchError) {
      console.error("Contact messages error:", fetchError);
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, [
    appliedSearch,
    pagination.limit,
    pagination.page,
    statusFilter,
  ]);

  useEffect(() => {
    void fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const openContact = async (contact: ContactMessage) => {
    setDetailsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/contact/${getContactId(contact)}`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );

      const result = await parseResponse<ContactSingleResponse>(response);

      const fullContact = result.contact || result.data || contact;

      setSelectedContact(fullContact);
      setReplyText(fullContact.adminReply || "");
      setSelectedStatus(fullContact.status);
    } catch (fetchError) {
      console.error("Contact details error:", fetchError);
      setError(getErrorMessage(fetchError));
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeContact = () => {
    if (saving) {
      return;
    }

    setSelectedContact(null);
    setReplyText("");
    setSelectedStatus("read");
  };

  const updateContact = async () => {
    if (!selectedContact) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/contact/${getContactId(selectedContact)}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            status: selectedStatus,
            adminReply: replyText.trim(),
          }),
        },
      );

      const result = await parseResponse<ContactSingleResponse>(response);

      const updatedContact =
        result.contact || result.data || selectedContact;

      setSelectedContact(updatedContact);

      setContacts((previousContacts) =>
        previousContacts.map((contact) =>
          getContactId(contact) === getContactId(updatedContact)
            ? updatedContact
            : contact,
        ),
      );

      setReplyText(updatedContact.adminReply || "");
      setSelectedStatus(updatedContact.status);

      await fetchStats();
    } catch (updateError) {
      console.error("Update contact error:", updateError);
      setError(getErrorMessage(updateError));
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (contact: ContactMessage) => {
    const contactId = getContactId(contact);

    const shouldDelete = window.confirm(
      `Delete the contact message from ${contact.name}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingId(contactId);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/contact/${contactId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        },
      );

      await parseResponse(response);

      setContacts((previousContacts) =>
        previousContacts.filter(
          (item) => getContactId(item) !== contactId,
        ),
      );

      if (selectedContact && getContactId(selectedContact) === contactId) {
        closeContact();
      }

      await fetchStats();
      await fetchContacts();
    } catch (deleteError) {
      console.error("Delete contact error:", deleteError);
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setPagination((previousPagination) => ({
      ...previousPagination,
      page: 1,
    }));

    setAppliedSearch(searchValue.trim());
  };

  const handleStatusFilterChange = (
    nextStatus: "all" | ContactStatus,
  ) => {
    setStatusFilter(nextStatus);

    setPagination((previousPagination) => ({
      ...previousPagination,
      page: 1,
    }));
  };

  const handlePageChange = (nextPage: number) => {
    if (
      nextPage < 1 ||
      nextPage > pagination.pages ||
      nextPage === pagination.page
    ) {
      return;
    }

    setPagination((previousPagination) => ({
      ...previousPagination,
      page: nextPage,
    }));
  };

  const handleRefresh = async () => {
    await Promise.all([fetchContacts(), fetchStats()]);
  };

  const totalPages = Math.max(pagination.pages, 1);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];

    for (let page = 1; page <= totalPages; page += 1) {
      if (
        page === 1 ||
        page === totalPages ||
        Math.abs(page - pagination.page) <= 2
      ) {
        pages.push(page);
      }
    }

    return pages;
  }, [pagination.page, totalPages]);

  const statsCards = [
    {
      key: "total",
      label: "Total Messages",
      value: stats.total || 0,
      icon: MessageSquare,
      className: "statTotal",
    },
    {
      key: "new",
      label: "New Messages",
      value: stats.new || 0,
      icon: Mail,
      className: "statNew",
    },
    {
      key: "replied",
      label: "Replied",
      value: stats.replied || 0,
      icon: CheckCircle2,
      className: "statReplied",
    },
    {
      key: "closed",
      label: "Closed",
      value: stats.closed || 0,
      icon: XCircle,
      className: "statClosed",
    },
  ];

  return (
    <section className="contactManager">
      <div className="contactManagerHeader">
        <div>
          <div className="contactManagerEyebrow">
            <Mail size={16} />
            Customer Communication
          </div>

          <h1>Contact Messages</h1>

          <p>
            View, manage, reply to, and track messages submitted through
            your website contact form.
          </p>
        </div>

        <button
          type="button"
          className="refreshButton"
          onClick={handleRefresh}
          disabled={loading || statsLoading}
        >
          <RefreshCw
            size={17}
            className={loading || statsLoading ? "spinIcon" : ""}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="managerAlert errorAlert" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {statsError && (
        <div className="managerAlert warningAlert" role="alert">
          <AlertCircle size={18} />
          <span>{statsError}</span>
        </div>
      )}

      <div className="contactStatsGrid">
        {statsCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className={`contactStatCard ${stat.className}`} key={stat.key}>
              <div className="contactStatIcon">
                <Icon size={21} />
              </div>

              <div className="contactStatContent">
                <span>{stat.label}</span>

                <strong>
                  {statsLoading ? (
                    <LoaderCircle size={21} className="spinIcon" />
                  ) : (
                    stat.value
                  )}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      <div className="contactManagerPanel">
        <div className="contactToolbar">
          <form className="contactSearchForm" onSubmit={handleSearchSubmit}>
            <Search size={18} />

            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by name, email, subject..."
              aria-label="Search contact messages"
            />

            {searchValue && (
              <button
                type="button"
                className="clearSearchButton"
                onClick={() => {
                  setSearchValue("");
                  setAppliedSearch("");
                  setPagination((previousPagination) => ({
                    ...previousPagination,
                    page: 1,
                  }));
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}

            <button type="submit" className="searchButton">
              Search
            </button>
          </form>

          <div className="contactFilterGroup">
            <label htmlFor="contact-status-filter">Status</label>

            <select
              id="contact-status-filter"
              value={statusFilter}
              onChange={(event) =>
                handleStatusFilterChange(
                  event.target.value as "all" | ContactStatus,
                )
              }
            >
              <option value="all">All Messages</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="contactTableWrapper">
          {loading ? (
            <div className="contactLoadingState">
              <LoaderCircle size={34} className="spinIcon" />
              <p>Loading contact messages...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="contactEmptyState">
              <div className="emptyStateIcon">
                <MessageSquare size={32} />
              </div>

              <h3>No contact messages found</h3>

              <p>
                There are no messages matching your current search or
                filter.
              </p>

              {(appliedSearch || statusFilter !== "all") && (
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() => {
                    setSearchValue("");
                    setAppliedSearch("");
                    setStatusFilter("all");
                    setPagination((previousPagination) => ({
                      ...previousPagination,
                      page: 1,
                    }));
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <table className="contactTable">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {contacts.map((contact) => (
                  <tr key={getContactId(contact)}>
                    <td>
                      <div className="customerCell">
                        <div className="customerAvatar">
                          {getInitials(contact.name || "User")}
                        </div>

                        <div className="customerDetails">
                          <strong>{contact.name}</strong>
                          <span>{contact.email}</span>

                          {contact.phone && (
                            <small>{contact.phone}</small>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="subjectCell">
                        {contact.subject}
                      </div>
                    </td>

                    <td>
                      <div className="messagePreview">
                        {contact.message}
                      </div>
                    </td>

                    <td>
                      <span className={getStatusClassName(contact.status)}>
                        {getStatusLabel(contact.status)}
                      </span>
                    </td>

                    <td>
                      <div className="dateCell">
                        <span>{formatShortDate(contact.createdAt)}</span>
                        <small>
                          {new Date(contact.createdAt).toLocaleTimeString(
                            "en-IN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </small>
                      </div>
                    </td>

                    <td>
                      <div className="tableActions">
                        <button
                          type="button"
                          className="iconActionButton viewAction"
                          onClick={() => void openContact(contact)}
                          disabled={detailsLoading}
                          title="View message"
                          aria-label={`View message from ${contact.name}`}
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          className="iconActionButton deleteAction"
                          onClick={() => void deleteContact(contact)}
                          disabled={deletingId === getContactId(contact)}
                          title="Delete message"
                          aria-label={`Delete message from ${contact.name}`}
                        >
                          {deletingId === getContactId(contact) ? (
                            <LoaderCircle
                              size={17}
                              className="spinIcon"
                            />
                          ) : (
                            <Trash2 size={17} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && contacts.length > 0 && (
          <div className="contactPagination">
            <span className="paginationSummary">
              Showing{" "}
              <strong>
                {(pagination.page - 1) * pagination.limit + 1}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total,
                )}
              </strong>{" "}
              of <strong>{pagination.total}</strong> messages
            </span>

            <div className="paginationControls">
              <button
                type="button"
                className="paginationButton"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>

              {pageNumbers.map((page, index) => {
                const previousPage = pageNumbers[index - 1];

                const showEllipsis =
                  previousPage && page - previousPage > 1;

                return (
                  <span className="paginationPageWrapper" key={page}>
                    {showEllipsis && (
                      <span className="paginationEllipsis">...</span>
                    )}

                    <button
                      type="button"
                      className={`paginationPage ${
                        pagination.page === page ? "activePage" : ""
                      }`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  </span>
                );
              })}

              <button
                type="button"
                className="paginationButton"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedContact && (
        <div
          className="contactModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
        >
          <div className="contactModal">
            <div className="contactModalHeader">
              <div>
                <span className="modalEyebrow">
                  <MessageSquare size={15} />
                  Contact Message
                </span>

                <h2 id="contact-modal-title">
                  {selectedContact.subject}
                </h2>
              </div>

              <button
                type="button"
                className="modalCloseButton"
                onClick={closeContact}
                disabled={saving}
                aria-label="Close contact message"
              >
                <X size={21} />
              </button>
            </div>

            <div className="contactModalBody">
              <div className="contactSenderCard">
                <div className="senderAvatar">
                  {getInitials(selectedContact.name || "User")}
                </div>

                <div className="senderInfo">
                  <strong>{selectedContact.name}</strong>

                  <a href={`mailto:${selectedContact.email}`}>
                    {selectedContact.email}
                  </a>

                  {selectedContact.phone && (
                    <a href={`tel:${selectedContact.phone}`}>
                      {selectedContact.phone}
                    </a>
                  )}
                </div>

                <div className="senderDate">
                  <Clock3 size={15} />
                  {formatDate(selectedContact.createdAt)}
                </div>
              </div>

              <div className="contactDetailSection">
                <div className="detailSectionHeading">
                  <UserRound size={17} />
                  Customer Message
                </div>

                <div className="originalMessage">
                  {selectedContact.message}
                </div>
              </div>

              <div className="contactDetailSection">
                <div className="detailSectionHeading">
                  <Send size={17} />
                  Admin Response
                </div>

                <label htmlFor="contact-admin-reply">
                  Reply message
                </label>

                <textarea
                  id="contact-admin-reply"
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Write your response to the customer..."
                  rows={6}
                  disabled={saving}
                />
              </div>

              <div className="contactStatusEditor">
                <label htmlFor="contact-status-editor">
                  Message status
                </label>

                <select
                  id="contact-status-editor"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(
                      event.target.value as ContactStatus,
                    )
                  }
                  disabled={saving}
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {selectedContact.repliedAt && (
                <div className="lastReplyInfo">
                  Last replied on {formatDate(selectedContact.repliedAt)}
                </div>
              )}
            </div>

            <div className="contactModalFooter">
              <button
                type="button"
                className="secondaryButton"
                onClick={closeContact}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primaryButton"
                onClick={() => void updateContact()}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <LoaderCircle size={17} className="spinIcon" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ContactUsManager;
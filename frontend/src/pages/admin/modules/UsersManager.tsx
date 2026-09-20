import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Ban,
  CheckCircle2,
  Edit,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlock,
  UserRound,
  X,
} from "lucide-react";

import "./UsersManager.css";

interface User {
  _id: string;
  name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  role?: string;
  isBlocked?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UserForm {
  name: string;
  email: string;
  phone: string;
  role: "user" | "superadmin";
}

type StatusFilter = "ALL" | "ACTIVE" | "BLOCKED";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

/* =========================================================
   API HELPERS
========================================================= */

const getToken = (): string => {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    ""
  );
};

const getHeaders = (): HeadersInit => {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
};

/* =========================================================
   USER HELPERS
========================================================= */

const formatDate = (date?: string): string => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getUserName = (user: User): string => {
  return user.name || user.fullName || "Unnamed User";
};

const normalizeRole = (
  role?: string,
): "user" | "superadmin" => {
  const normalizedRole = String(role || "user")
    .trim()
    .toLowerCase();

  if (
    normalizedRole === "admin" ||
    normalizedRole === "superadmin"
  ) {
    return "superadmin";
  }

  return "user";
};

const getRoleLabel = (role?: string): string => {
  return normalizeRole(role) === "superadmin"
    ? "Super Admin"
    : "User";
};

/*
  Backend may return:
  isBlocked: true
  OR
  isActive: false

  Both should be treated as blocked/inaccessible.
*/
const isUserBlocked = (user: User): boolean => {
  return (
    user.isBlocked === true ||
    user.isActive === false
  );
};

const getStatusLabel = (user: User): string => {
  return isUserBlocked(user) ? "Blocked" : "Active";
};

const getStatusClassName = (user: User): string => {
  return isUserBlocked(user) ? "blocked" : "active";
};

/* =========================================================
   RESPONSE HELPERS
========================================================= */

const extractUsers = (data: unknown): User[] => {
  if (!data || typeof data !== "object") {
    return [];
  }

  const responseData = data as {
    users?: User[];
    data?: User[] | { users?: User[] };
  };

  if (Array.isArray(responseData.users)) {
    return responseData.users;
  }

  if (Array.isArray(responseData.data)) {
    return responseData.data;
  }

  if (
    responseData.data &&
    typeof responseData.data === "object" &&
    Array.isArray(responseData.data.users)
  ) {
    return responseData.data.users;
  }

  return [];
};

const extractUser = (data: unknown): User | null => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const responseData = data as {
    user?: User;
    data?: User | { user?: User };
  };

  if (responseData.user) {
    return responseData.user;
  }

  if (
    responseData.data &&
    typeof responseData.data === "object" &&
    "user" in responseData.data
  ) {
    return responseData.data.user || null;
  }

  if (
    responseData.data &&
    typeof responseData.data === "object"
  ) {
    return responseData.data as User;
  }

  return null;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editMode, setEditMode] = useState(false);

  const [userForm, setUserForm] = useState<UserForm>({
    name: "",
    email: "",
    phone: "",
    role: "user",
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const showError = useCallback((message: string) => {
    setError(message);
    setSuccessMessage("");
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setError("");
  }, []);

  /* =========================================================
     FETCH USERS
  ========================================================= */

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_BASE_URL}/admin/users`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load users",
        );
      }

      setUsers(extractUsers(data));
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* =========================================================
     FILTER USERS
  ========================================================= */

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const searchableText = [
        getUserName(user),
        user.email,
        user.phone,
        getRoleLabel(user.role),
        getStatusLabel(user),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !search || searchableText.includes(search);

      const blocked = isUserBlocked(user);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && !blocked) ||
        (statusFilter === "BLOCKED" && blocked);

      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const statistics = useMemo(() => {
    return {
      total: users.length,

      active: users.filter(
        (user) => !isUserBlocked(user),
      ).length,

      blocked: users.filter(
        (user) => isUserBlocked(user),
      ).length,

      admins: users.filter(
        (user) =>
          normalizeRole(user.role) === "superadmin",
      ).length,
    };
  }, [users]);

  /* =========================================================
     OPEN USER MODAL
  ========================================================= */

  const openUser = (user: User) => {
    setSelectedUser(user);
    setEditMode(false);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMessage("");

    setUserForm({
      name: user.name || user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      role:
        normalizeRole(user.role) === "superadmin"
          ? "superadmin"
          : "user",
    });
  };

  /* =========================================================
     UPDATE LOCAL USER
  ========================================================= */

  const updateLocalUser = (updatedUser: User | null) => {
    if (!selectedUser || !updatedUser) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user._id === selectedUser._id
          ? updatedUser
          : user,
      ),
    );

    setSelectedUser(updatedUser);
  };

  /* =========================================================
     UPDATE USER DETAILS
     PUT /api/admin/users/:id
  ========================================================= */

  const updateUser = async () => {
    if (!selectedUser) return;

    const name = userForm.name.trim();
    const email = userForm.email.trim().toLowerCase();
    const phone = userForm.phone.trim();

    if (!name) {
      showError("Name is required.");
      return;
    }

    if (!email) {
      showError("Email is required.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_BASE_URL}/admin/users/${selectedUser._id}`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            name,
            email,
            phone,
            role: userForm.role,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update user",
        );
      }

      updateLocalUser(extractUser(data));
      setEditMode(false);
      showSuccess("User details updated successfully.");
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update user",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     BLOCK OR UNBLOCK USER
     PUT /api/admin/users/:id/block
  ========================================================= */

  const toggleBlockUser = async () => {
    if (!selectedUser) return;

    /*
      If isBlocked is true OR isActive is false,
      the account is considered blocked.

      Therefore:
      blocked account  -> unblock
      active account   -> block
    */
    const shouldBlock = !isUserBlocked(selectedUser);

    const actionText = shouldBlock
      ? "Block"
      : "Unblock";

    const confirmed = window.confirm(
      `${actionText} ${getUserName(selectedUser)}?`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_BASE_URL}/admin/users/${selectedUser._id}/block`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            isBlocked: shouldBlock,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to ${
              shouldBlock ? "block" : "unblock"
            } user`,
        );
      }

      const updatedUser = extractUser(data);

      if (updatedUser) {
        updateLocalUser(updatedUser);
      } else {
        const fallbackUser: User = {
          ...selectedUser,
          isBlocked: shouldBlock,
          isActive: !shouldBlock,
        };

        setSelectedUser(fallbackUser);

        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user._id === selectedUser._id
              ? fallbackUser
              : user,
          ),
        );
      }

      showSuccess(
        shouldBlock
          ? "User blocked successfully."
          : "User unblocked successfully. The user can log in now.",
      );
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update block status",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     RESET USER PASSWORD
     PUT /api/admin/users/:id/reset-password
  ========================================================= */

  const resetPassword = async () => {
    if (!selectedUser) return;

    if (newPassword.length < 8) {
      showError(
        "Password must contain at least 8 characters.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    const confirmed = window.confirm(
      `Reset password for ${getUserName(selectedUser)}?`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const response = await fetch(
        `${API_BASE_URL}/admin/users/${selectedUser._id}/reset-password`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            password: newPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to reset password",
        );
      }

      setNewPassword("");
      setConfirmPassword("");

      showSuccess("Password reset successfully.");
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to reset password",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <section className="usersManager">
      <div className="usersManagerHeader">
        <div>
          <span className="usersEyebrow">
            ADMIN PANEL
          </span>

          <h1>User Management</h1>

          <p>
            View registered users, update their details,
            block or unblock accounts, and reset passwords.
          </p>
        </div>

        <button
          type="button"
          className="usersRefreshButton"
          onClick={fetchUsers}
          disabled={loading || saving}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="usersAlert usersAlertError">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="usersAlert usersAlertSuccess">
          {successMessage}
        </div>
      )}

      <div className="usersStatsGrid">
        <div className="usersStatCard">
          <UserRound size={21} />

          <div>
            <span>Total Users</span>
            <strong>{statistics.total}</strong>
          </div>
        </div>

        <div className="usersStatCard active">
          <CheckCircle2 size={21} />

          <div>
            <span>Active Users</span>
            <strong>{statistics.active}</strong>
          </div>
        </div>

        <div className="usersStatCard blocked">
          <Ban size={21} />

          <div>
            <span>Blocked Users</span>
            <strong>{statistics.blocked}</strong>
          </div>
        </div>

        <div className="usersStatCard admin">
          <ShieldCheck size={21} />

          <div>
            <span>Super Admins</span>
            <strong>{statistics.admins}</strong>
          </div>
        </div>
      </div>

      <div className="usersFilters">
        <div className="usersSearch">
          <Search size={18} />

          <input
            type="search"
            placeholder="Search by name, email or phone..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as StatusFilter,
            )
          }
        >
          <option value="ALL">All Users</option>
          <option value="ACTIVE">Active Users</option>
          <option value="BLOCKED">Blocked Users</option>
        </select>
      </div>

      <div className="usersTableCard">
        <div className="usersTableHeading">
          <div>
            <h2>Registered Users</h2>
            <p>{filteredUsers.length} user(s) found</p>
          </div>
        </div>

        {loading ? (
          <div className="usersEmptyState">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="usersEmptyState">
            <UserRound size={42} />

            <h3>No users found</h3>

            <p>Try changing your search or filter.</p>
          </div>
        ) : (
          <div className="usersTableScroll">
            <table className="usersTable">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Registered On</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <strong>{getUserName(user)}</strong>
                      <small>{user.email}</small>
                    </td>

                    <td>{user.phone || "—"}</td>

                    <td>
                      <span className="usersRoleBadge">
                        {getRoleLabel(user.role)}
                      </span>
                    </td>

                    <td>{formatDate(user.createdAt)}</td>

                    <td>
                      <span
                        className={`usersStatusBadge ${getStatusClassName(
                          user,
                        )}`}
                      >
                        {getStatusLabel(user)}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="usersViewButton"
                        onClick={() => openUser(user)}
                      >
                        <Edit size={15} />
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div
          className="usersModalOverlay"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="usersModal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="usersModalHeader">
              <div>
                <span className="usersEyebrow">
                  USER DETAILS
                </span>

                <h2>{getUserName(selectedUser)}</h2>
                <p>{selectedUser.email}</p>
              </div>

              <button
                type="button"
                className="usersCloseButton"
                onClick={() => setSelectedUser(null)}
                aria-label="Close user details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="usersModalBody">
              {error && (
                <div className="usersAlert usersAlertError">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="usersAlert usersAlertSuccess">
                  {successMessage}
                </div>
              )}

              <div className="usersDetailsCard">
                <div className="usersDetailsHeading">
                  <h3>Account Information</h3>

                  <button
                    type="button"
                    className="usersSecondaryButton"
                    onClick={() =>
                      setEditMode((current) => !current)
                    }
                    disabled={saving}
                  >
                    <Edit size={15} />

                    {editMode ? "Cancel Edit" : "Edit User"}
                  </button>
                </div>

                <div className="usersFormGrid">
                  <div>
                    <label htmlFor="userName">
                      Full Name
                    </label>

                    <input
                      id="userName"
                      type="text"
                      value={userForm.name}
                      disabled={!editMode || saving}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="userEmail">
                      Email
                    </label>

                    <input
                      id="userEmail"
                      type="email"
                      value={userForm.email}
                      disabled={!editMode || saving}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="userPhone">
                      Phone
                    </label>

                    <input
                      id="userPhone"
                      type="text"
                      value={userForm.phone}
                      disabled={!editMode || saving}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="userRole">Role</label>

                    <select
                      id="userRole"
                      value={userForm.role}
                      disabled={!editMode || saving}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          role:
                            event.target.value as
                              | "user"
                              | "superadmin",
                        }))
                      }
                    >
                      <option value="user">User</option>

                      <option value="superadmin">
                        Super Admin
                      </option>
                    </select>
                  </div>
                </div>

                {editMode && (
                  <button
                    type="button"
                    className="usersPrimaryButton"
                    onClick={updateUser}
                    disabled={saving}
                  >
                    <CheckCircle2 size={16} />

                    {saving
                      ? "Saving..."
                      : "Save User Details"}
                  </button>
                )}
              </div>

              <div className="usersDetailsCard">
                <div className="usersDetailsHeading">
                  <h3>Account Status</h3>

                  <span
                    className={`usersStatusBadge ${getStatusClassName(
                      selectedUser,
                    )}`}
                  >
                    {getStatusLabel(selectedUser)}
                  </span>
                </div>

                <p className="usersDescription">
                  Blocked users cannot log in, access protected
                  routes, or place new orders. Unblocking the
                  user activates the account again.
                </p>

                <button
                  type="button"
                  className={
                    isUserBlocked(selectedUser)
                      ? "usersPrimaryButton unblock"
                      : "usersDangerButton"
                  }
                  onClick={toggleBlockUser}
                  disabled={saving}
                >
                  {isUserBlocked(selectedUser) ? (
                    <>
                      <Unlock size={16} />

                      {saving
                        ? "Unblocking..."
                        : "Unblock User"}
                    </>
                  ) : (
                    <>
                      <Lock size={16} />

                      {saving ? "Blocking..." : "Block User"}
                    </>
                  )}
                </button>
              </div>

              <div className="usersDetailsCard">
                <div className="usersDetailsHeading">
                  <h3>Reset Password</h3>
                  <KeyRound size={19} />
                </div>

                <div className="usersFormGrid">
                  <div>
                    <label htmlFor="newPassword">
                      New Password
                    </label>

                    <input
                      id="newPassword"
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      disabled={saving}
                      onChange={(event) =>
                        setNewPassword(event.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword">
                      Confirm Password
                    </label>

                    <input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      disabled={saving}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="usersPrimaryButton"
                  onClick={resetPassword}
                  disabled={saving}
                >
                  <KeyRound size={16} />

                  {saving
                    ? "Resetting..."
                    : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
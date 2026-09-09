const API_BASE = "";

const TOKEN_KEY = "trusttrace_token";
const USER_KEY = "trusttrace_user";

let products = [];
let scans = [];
let flags = [];
let users = [];
let currentUser = null;


/* =========================
   AUTHENTICATION
========================= */

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}


function saveUser(user) {
    localStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
    );
}


function getStoredUser() {
    const user = localStorage.getItem(USER_KEY);

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user);
    } catch {
        return null;
    }
}


function clearAuthentication() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}


function isAuthenticated() {
    return Boolean(getToken());
}


function hasRole(...roles) {
    if (!currentUser) {
        return false;
    }

    return roles.includes(currentUser.role);
}


function authHeaders(extraHeaders = {}) {
    const token = getToken();

    return {
        ...extraHeaders,
        Authorization: `Bearer ${token}`
    };
}


async function loadCurrentUser() {
    const token = getToken();

    if (!token) {
        return null;
    }

    try {
        const response = await fetch(
            `${API_BASE}/auth/me`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            clearAuthentication();
            return null;
        }

        const user = await response.json();

        currentUser = user;
        saveUser(user);

        return user;

    } catch (error) {
        console.error(
            "Error loading current user:",
            error
        );

        clearAuthentication();

        return null;
    }
}


function handleUnauthorized() {
    clearAuthentication();

    window.location.href = "/login";
}


function logout() {
    clearAuthentication();

    window.location.href = "/login";
}


/* =========================
   INITIALIZATION
========================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const user = await loadCurrentUser();

        if (!user) {
            showLoginRequired();
            return;
        }

        currentUser = user;

        displayCurrentUser();

        applyRolePermissions();

        await loadDashboard();

        attachEventListeners();
    }
);


/* =========================
   LOGIN REQUIREMENT
========================= */

function showLoginRequired() {

    const container =
        document.querySelector(".container");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <section class="panel">
            <div class="panel-header">
                <div>
                    <h2>
                        Authentication Required
                    </h2>

                    <p>
                        Please log in to access
                        the TrustTrace dashboard.
                    </p>
                </div>
            </div>

            <button
                type="button"
                class="primary-button"
                onclick="window.location.href='/login'"
            >
                Go to Login
            </button>
        </section>
    `;
}


/* =========================
   USER DISPLAY
========================= */

function displayCurrentUser() {

    const emailElements =
        document.querySelectorAll(
            "[data-user-email]"
        );

    const roleElements =
        document.querySelectorAll(
            "[data-user-role]"
        );

    emailElements.forEach(
        (element) => {
            element.textContent =
                currentUser?.email ||
                "Unknown";
        }
    );

    roleElements.forEach(
        (element) => {
            element.textContent =
                formatRole(
                    currentUser?.role
                );
        }
    );
}


function formatRole(role) {

    if (!role) {
        return "Unknown";
    }

    const roleNames = {
        super_admin: "Super Admin",
        brand_admin: "Brand Admin",
        investigator: "Investigator",
        staff: "Staff"
    };

    return (
        roleNames[role] ||
        role
    );
}


/* =========================
   ROLE PERMISSIONS
========================= */

function applyRolePermissions() {

    const userManagement =
        document.getElementById(
            "user-management"
        );

    const productForm =
        document.getElementById(
            "product-form"
        );

    const productManagement =
        document.getElementById(
            "product-management"
        );

    const flagsSection =
        document.getElementById(
            "flags-section"
        );

    if (userManagement) {

        if (hasRole("super_admin")) {

            userManagement.classList.remove(
                "hidden"
            );

            userManagement.style.display =
                "block";

        } else {

            userManagement.classList.add(
                "hidden"
            );

            userManagement.style.display =
                "none";
        }
    }


    if (productManagement) {

        if (
            hasRole(
                "super_admin",
                "brand_admin"
            )
        ) {

            productManagement.classList.remove(
                "hidden"
            );

            productManagement.style.display =
                "block";

        } else {

            productManagement.classList.add(
                "hidden"
            );

            productManagement.style.display =
                "none";
        }
    }


    if (productForm) {

        if (
            hasRole(
                "super_admin",
                "brand_admin"
            )
        ) {
            productForm.style.display =
                "block";
        } else {
            productForm.style.display =
                "none";
        }
    }


    if (flagsSection) {

        if (
            hasRole(
                "super_admin",
                "brand_admin",
                "investigator"
            )
        ) {

            flagsSection.classList.remove(
                "hidden"
            );

            flagsSection.style.display =
                "block";

        } else {

            flagsSection.classList.add(
                "hidden"
            );

            flagsSection.style.display =
                "none";
        }
    }
}


/* =========================
   EVENT LISTENERS
========================= */

function attachEventListeners() {

    const refreshButton =
        document.getElementById(
            "refresh-btn"
        );

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadDashboard
        );
    }


    const logoutButton =
        document.getElementById(
            "logout-btn"
        );

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );
    }


    const productForm =
        document.getElementById(
            "product-form"
        );

    if (productForm) {

        productForm.addEventListener(
            "submit",
            handleProductSubmit
        );
    }


    const scanForm =
        document.getElementById(
            "scan-form"
        );

    if (scanForm) {

        scanForm.addEventListener(
            "submit",
            handleScanSubmit
        );
    }


    const userForm =
        document.getElementById(
            "user-form"
        );

    if (userForm) {

        userForm.addEventListener(
            "submit",
            handleUserSubmit
        );
    }


    const closeInvestigationButton =
        document.getElementById(
            "close-investigation"
        );

    if (closeInvestigationButton) {

        closeInvestigationButton.addEventListener(
            "click",
            closeInvestigation
        );
    }
}


/* =========================
   DASHBOARD
========================= */

async function loadDashboard() {

    if (!isAuthenticated()) {
        handleUnauthorized();
        return;
    }

    try {

        await Promise.all([
            loadProducts(),
            loadScans(),
            loadFlags()
        ]);

        updateSummary();
        renderProducts();
        renderScans();
        renderFlags();

        updateAlertBanner(
            flags.length > 0
        );

        if (hasRole("super_admin")) {
            await loadUsers();
        }

    } catch (error) {

        console.error(
            "Error loading dashboard:",
            error
        );
    }
}


/* =========================
   PRODUCTS
========================= */

async function loadProducts() {

    const response =
        await fetch(
            `${API_BASE}/products/`,
            {
                headers:
                    authHeaders()
            }
        );

    if (response.status === 401) {
        handleUnauthorized();
        return;
    }

    if (!response.ok) {

        throw new Error(
            "Failed to load products"
        );
    }

    products =
        await response.json();
}


function renderProducts() {

    const tableBody =
        document.getElementById(
            "products-table-body"
        );

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!products.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="3"
                    class="loading"
                >
                    No registered products.
                </td>
            </tr>
        `;

        return;
    }

    products.forEach(
        (product) => {

            const row =
                document.createElement(
                    "tr"
                );

            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        product.code
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        product.product_name
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        product.batch_id
                    )}
                </td>
            `;

            tableBody.appendChild(
                row
            );
        }
    );
}


/* =========================
   SCANS
========================= */

async function loadScans() {

    const response =
        await fetch(
            `${API_BASE}/scan/`,
            {
                headers:
                    authHeaders()
            }
        );

    if (response.status === 401) {
        handleUnauthorized();
        return;
    }

    if (!response.ok) {

        throw new Error(
            "Failed to load scans"
        );
    }

    scans =
        await response.json();
}


function renderScans() {

    const tableBody =
        document.getElementById(
            "scans-table-body"
        );

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!scans.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="loading"
                >
                    No scan events recorded.
                </td>
            </tr>
        `;

        return;
    }

    scans.forEach(
        (scan) => {

            const row =
                document.createElement(
                    "tr"
                );

            const flagged =
                Boolean(scan.flagged);

            row.innerHTML = `
                <td>
                    ${scan.id}
                </td>

                <td>
                    ${escapeHtml(
                        scan.code
                    )}
                </td>

                <td>
                    ${formatDate(
                        scan.timestamp
                    )}
                </td>

                <td>
                    ${formatLocation(
                        scan.latitude,
                        scan.longitude
                    )}
                </td>

                <td>
                    <span
                        class="status-badge ${
                            flagged
                                ? "flagged"
                                : "safe"
                        }"
                    >
                        ${
                            flagged
                                ? "Flagged"
                                : "Safe"
                        }
                    </span>
                </td>

                <td>
                    ${
                        scan.flag_reason
                            ? escapeHtml(
                                scan.flag_reason
                            )
                            : "No anomaly detected"
                    }
                </td>
            `;

            tableBody.appendChild(
                row
            );
        }
    );
}


/* =========================
   FLAGS
========================= */

async function loadFlags() {

    const response =
        await fetch(
            `${API_BASE}/scan/flags`,
            {
                headers:
                    authHeaders()
            }
        );

    if (response.status === 401) {
        handleUnauthorized();
        return;
    }

    if (!response.ok) {

        throw new Error(
            "Failed to load flagged scans"
        );
    }

    flags =
        await response.json();
}


function renderFlags() {

    const tableBody =
        document.getElementById(
            "flags-table-body"
        );

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!flags.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="loading"
                >
                    No flagged scans found.
                </td>
            </tr>
        `;

        return;
    }

    flags.forEach(
        (scan) => {

            const row =
                document.createElement(
                    "tr"
                );

            const reviewStatus =
                scan.review_status ||
                "PENDING";

            let reviewStatusClass =
                "review-required";

            if (
                reviewStatus === "REVIEWED" ||
                reviewStatus === "DISMISSED"
            ) {
                reviewStatusClass =
                    "status-safe";
            }

            const riskClass =
                getRiskClass(scan);

            const riskText =
                getRiskText(scan);

            const canReview =
                hasRole(
                    "super_admin",
                    "investigator"
                );

            row.innerHTML = `
                <td>
                    ${scan.id}
                </td>

                <td>
                    ${escapeHtml(
                        scan.code
                    )}
                </td>

                <td>
                    ${formatDate(
                        scan.timestamp
                    )}
                </td>

                <td>
                    ${formatLocation(
                        scan.latitude,
                        scan.longitude
                    )}
                </td>

                <td>
                    <span
                        class="status-badge flagged"
                    >
                        Flagged
                    </span>
                </td>

                <td>
                    <span
                        class="status-badge ${riskClass}"
                    >
                        ${riskText}
                    </span>
                </td>

                <td>
                    <span
                        class="${reviewStatusClass}"
                    >
                        ${escapeHtml(
                            reviewStatus
                        )}
                    </span>
                </td>

                <td>
                    ${
                        canReview
                            ? `
                                <button
                                    type="button"
                                    class="review-button"
                                    data-scan-id="${scan.id}"
                                >
                                    Review
                                </button>
                            `
                            : "View only"
                    }
                </td>

                <td class="review-reason">
                    ${
                        scan.flag_reason
                            ? escapeHtml(
                                scan.flag_reason
                            )
                            : "No detection reason"
                    }
                </td>
            `;

            tableBody.appendChild(
                row
            );
        }
    );


    document
        .querySelectorAll(
            ".review-button"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        const scanId =
                            button.dataset.scanId;

                        openInvestigation(
                            scanId
                        );
                    }
                );
            }
        );
}


/* =========================
   SUMMARY
========================= */

function updateSummary() {

    const totalScans =
        document.getElementById(
            "total-scans"
        );

    const flaggedScans =
        document.getElementById(
            "flagged-scans"
        );

    const safeScans =
        document.getElementById(
            "safe-scans"
        );

    const totalProducts =
        document.getElementById(
            "total-products"
        );

    if (totalScans) {
        totalScans.textContent =
            scans.length;
    }

    if (flaggedScans) {
        flaggedScans.textContent =
            flags.length;
    }

    if (safeScans) {
        safeScans.textContent =
            Math.max(
                scans.length - flags.length,
                0
            );
    }

    if (totalProducts) {
        totalProducts.textContent =
            products.length;
    }
}


/* =========================
   ALERT BANNER
========================= */

function updateAlertBanner(
    hasFlags
) {

    const banner =
        document.getElementById(
            "alert-banner"
        );

    const title =
        document.getElementById(
            "alert-title"
        );

    const description =
        document.getElementById(
            "alert-description"
        );

    if (!banner) {
        return;
    }

    banner.classList.remove(
        "hidden",
        "alert-warning",
        "alert-safe"
    );

    if (hasFlags) {

        banner.classList.add(
            "alert-warning"
        );

        if (title) {

            title.textContent =
                "Suspicious activity detected";
        }

        if (description) {

            description.textContent =
                `${flags.length} flagged scan event${
                    flags.length === 1
                        ? ""
                        : "s"
                } require review.`;
        }

    } else {

        banner.classList.add(
            "alert-safe"
        );

        if (title) {

            title.textContent =
                "No suspicious activity detected";
        }

        if (description) {

            description.textContent =
                "All recent scan events appear safe.";
        }
    }
}


/* =========================
   INVESTIGATION
========================= */

function openInvestigation(
    scanId
) {

    if (
        !hasRole(
            "super_admin",
            "investigator"
        )
    ) {
        return;
    }

    const panel =
        document.getElementById(
            "investigation-panel"
        );

    const content =
        document.getElementById(
            "investigation-content"
        );

    if (
        !panel ||
        !content
    ) {

        console.error(
            "Investigation panel or content not found."
        );

        return;
    }

    const scan =
        scans.find(
            (item) =>
                Number(item.id) ===
                Number(scanId)
        );

    if (!scan) {

        console.error(
            "Could not find scan:",
            scanId
        );

        return;
    }

    content.innerHTML = `
        <div class="investigation-grid">

            <div class="investigation-item">
                <span>Scan ID</span>
                <strong>
                    ${scan.id}
                </strong>
            </div>

            <div class="investigation-item">
                <span>Product Code</span>
                <strong>
                    ${escapeHtml(
                        scan.code
                    )}
                </strong>
            </div>

            <div class="investigation-item">
                <span>Timestamp</span>
                <strong>
                    ${formatDate(
                        scan.timestamp
                    )}
                </strong>
            </div>

            <div class="investigation-item">
                <span>Location</span>
                <strong>
                    ${formatLocation(
                        scan.latitude,
                        scan.longitude
                    )}
                </strong>
            </div>

            <div class="investigation-item">
                <span>Current Review Status</span>
                <strong>
                    ${escapeHtml(
                        scan.review_status ||
                        "PENDING"
                    )}
                </strong>
            </div>

            <div class="investigation-reason">
                <span>Detection Reason</span>

                <p>
                    ${
                        scan.flag_reason
                            ? escapeHtml(
                                scan.flag_reason
                            )
                            : "No detection reason"
                    }
                </p>
            </div>

            <div class="investigation-note">
                <label for="review-note">
                    Investigation Note
                </label>

                <textarea
                    id="review-note"
                    placeholder="Add a review note..."
                ></textarea>
            </div>

        </div>

        <div class="investigation-actions">

            <div class="review-actions">

                <button
                    type="button"
                    class="primary-button"
                    onclick="submitReview(
                        ${scan.id},
                        'REVIEWED'
                    )"
                >
                    Confirm Review
                </button>

                <button
                    type="button"
                    class="secondary-button"
                    onclick="submitReview(
                        ${scan.id},
                        'DISMISSED'
                    )"
                >
                    Dismiss Flag
                </button>

            </div>

            <div
                id="review-message"
                class="review-message"
            ></div>

        </div>
    `;

    panel.classList.remove(
        "hidden"
    );

    panel.style.display =
        "block";

    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function closeInvestigation() {

    const panel =
        document.getElementById(
            "investigation-panel"
        );

    if (!panel) {
        return;
    }

    panel.classList.add(
        "hidden"
    );

    panel.style.display =
        "none";
}


/* =========================
   REVIEW
========================= */

async function submitReview(
    scanId,
    reviewStatus
) {

    if (
        !hasRole(
            "super_admin",
            "investigator"
        )
    ) {
        return;
    }

    const noteElement =
        document.getElementById(
            "review-note"
        );

    const messageElement =
        document.getElementById(
            "review-message"
        );

    const reviewNote =
        noteElement
            ? noteElement.value.trim()
            : "";

    try {

        const response =
            await fetch(
                `${API_BASE}/scan/${scanId}/review`,
                {
                    method: "PATCH",

                    headers: authHeaders({
                        "Content-Type":
                            "application/json"
                    }),

                    body: JSON.stringify({
                        review_status:
                            reviewStatus,

                        review_note:
                            reviewNote ||
                            null
                    })
                }
            );

        if (
            response.status === 401
        ) {
            handleUnauthorized();
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to update review"
            );
        }

        if (messageElement) {

            messageElement.textContent =
                `Review updated to ${reviewStatus}.`;

            messageElement.classList.remove(
                "error"
            );

            messageElement.classList.add(
                "success"
            );
        }

        await loadDashboard();

        openInvestigation(
            scanId
        );

    } catch (error) {

        console.error(
            "Error submitting review:",
            error
        );

        if (messageElement) {

            messageElement.textContent =
                error.message ||
                "Failed to update review.";

            messageElement.classList.remove(
                "success"
            );

            messageElement.classList.add(
                "error"
            );
        }
    }
}


/* =========================
   PRODUCT REGISTRATION
========================= */

async function handleProductSubmit(
    event
) {

    event.preventDefault();

    if (
        !hasRole(
            "super_admin",
            "brand_admin"
        )
    ) {
        return;
    }

    const code =
        document.getElementById(
            "product-code"
        ).value.trim();

    const productName =
        document.getElementById(
            "product-name"
        ).value.trim();

    const batchId =
        document.getElementById(
            "batch-id"
        ).value.trim();

    const message =
        document.getElementById(
            "product-message"
        );

    try {

        const response =
            await fetch(
                `${API_BASE}/products/`,
                {
                    method: "POST",

                    headers: authHeaders({
                        "Content-Type":
                            "application/json"
                    }),

                    body: JSON.stringify({
                        code,
                        product_name:
                            productName,
                        batch_id:
                            batchId
                    })
                }
            );

        if (
            response.status === 401
        ) {
            handleUnauthorized();
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to register product"
            );
        }

        if (message) {

            message.textContent =
                "Product registered successfully.";

            message.classList.remove(
                "form-error"
            );

            message.classList.add(
                "form-success"
            );
        }

        event.target.reset();

        await loadProducts();

        updateSummary();

        renderProducts();

    } catch (error) {

        console.error(
            "Error registering product:",
            error
        );

        if (message) {

            message.textContent =
                error.message ||
                "Failed to register product.";

            message.classList.remove(
                "form-success"
            );

            message.classList.add(
                "form-error"
            );
        }
    }
}


/* =========================
   SCAN SUBMISSION
========================= */

async function handleScanSubmit(
    event
) {

    event.preventDefault();

    if (
        !hasRole(
            "super_admin",
            "brand_admin",
            "staff"
        )
    ) {
        return;
    }

    const code =
        document.getElementById(
            "scan-code"
        ).value.trim();

    const timestamp =
        document.getElementById(
            "scan-timestamp"
        ).value;

    const latitude =
        document.getElementById(
            "latitude"
        ).value;

    const longitude =
        document.getElementById(
            "longitude"
        ).value;

    const message =
        document.getElementById(
            "scan-message"
        );

    try {

        const response =
            await fetch(
                `${API_BASE}/scan/`,
                {
                    method: "POST",

                    headers: authHeaders({
                        "Content-Type":
                            "application/json"
                    }),

                    body: JSON.stringify({
                        code,

                        timestamp,

                        latitude:
                            Number(latitude),

                        longitude:
                            Number(longitude)
                    })
                }
            );

        if (
            response.status === 401
        ) {
            handleUnauthorized();
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to submit scan"
            );
        }

        if (message) {

            message.textContent =
                data.flagged
                    ? "Scan submitted and flagged."
                    : "Scan submitted successfully.";

            message.classList.remove(
                "form-error"
            );

            message.classList.add(
                data.flagged
                    ? "form-error"
                    : "form-success"
            );
        }

        event.target.reset();

        await loadDashboard();

    } catch (error) {

        console.error(
            "Error submitting scan:",
            error
        );

        if (message) {

            message.textContent =
                error.message ||
                "Failed to submit scan.";

            message.classList.remove(
                "form-success"
            );

            message.classList.add(
                "form-error"
            );
        }
    }
}


/* =========================
   USER MANAGEMENT
========================= */

async function loadUsers() {

    if (!hasRole("super_admin")) {
        return;
    }

    const response =
        await fetch(
            `${API_BASE}/auth/users`,
            {
                headers:
                    authHeaders()
            }
        );

    if (response.status === 401) {
        handleUnauthorized();
        return;
    }

    if (response.status === 403) {

        console.error(
            "User management access denied."
        );

        return;
    }

    if (!response.ok) {

        throw new Error(
            "Failed to load users"
        );
    }

    users =
        await response.json();

    renderUsers();
}


function renderUsers() {

    const tableBody =
        document.getElementById(
            "users-table-body"
        );

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!users.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="loading"
                >
                    No users found.
                </td>
            </tr>
        `;

        return;
    }

    users.forEach(
        (user) => {

            const row =
                document.createElement(
                    "tr"
                );

            const statusClass =
                user.is_active
                    ? "status-safe"
                    : "review-required";

            const statusText =
                user.is_active
                    ? "Active"
                    : "Inactive";

            row.innerHTML = `
                <td>
                    ${user.id}
                </td>

                <td>
                    ${escapeHtml(
                        user.email
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        formatRole(
                            user.role
                        )
                    )}
                </td>

                <td>
                    <span
                        class="${statusClass}"
                    >
                        ${statusText}
                    </span>
                </td>
            `;

            tableBody.appendChild(
                row
            );
        }
    );
}


async function handleUserSubmit(
    event
) {

    event.preventDefault();

    if (!hasRole("super_admin")) {
        return;
    }

    const email =
        document.getElementById(
            "user-email"
        ).value.trim();

    const password =
        document.getElementById(
            "user-password"
        ).value;

    const role =
        document.getElementById(
            "user-role"
        ).value;

    const message =
        document.getElementById(
            "user-message"
        );

    if (password.length < 8) {

        if (message) {

            message.textContent =
                "Password must contain at least 8 characters.";

            message.classList.remove(
                "form-success"
            );

            message.classList.add(
                "form-error"
            );
        }

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE}/auth/register`,
                {
                    method: "POST",

                    headers: authHeaders({
                        "Content-Type":
                            "application/json"
                    }),

                    body: JSON.stringify({
                        email,
                        password,
                        role
                    })
                }
            );

        if (
            response.status === 401
        ) {
            handleUnauthorized();
            return;
        }

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to create user"
            );
        }

        if (message) {

            message.textContent =
                "User created successfully.";

            message.classList.remove(
                "form-error"
            );

            message.classList.add(
                "form-success"
            );
        }

        event.target.reset();

        await loadUsers();

    } catch (error) {

        console.error(
            "Error creating user:",
            error
        );

        if (message) {

            message.textContent =
                error.message ||
                "Failed to create user.";

            message.classList.remove(
                "form-success"
            );

            message.classList.add(
                "form-error"
            );
        }
    }
}


/* =========================
   RISK CLASSIFICATION
========================= */

function getRiskClass(
    scan
) {

    const reason =
        (
            scan.flag_reason ||
            ""
        ).toLowerCase();

    if (
        reason.includes(
            "impossible travel"
        )
    ) {
        return "review-high";
    }

    if (
        reason.includes(
            "high scan frequency"
        )
    ) {
        return "review-medium";
    }

    if (
        reason.includes(
            "invalid product code"
        )
    ) {
        return "review-medium";
    }

    return "review-low";
}


function getRiskText(
    scan
) {

    const reason =
        (
            scan.flag_reason ||
            ""
        ).toLowerCase();

    if (
        reason.includes(
            "impossible travel"
        )
    ) {
        return "High";
    }

    if (
        reason.includes(
            "high scan frequency"
        )
    ) {
        return "Medium";
    }

    if (
        reason.includes(
            "invalid product code"
        )
    ) {
        return "Medium";
    }

    return "Low";
}


/* =========================
   FORMATTING
========================= */

function formatLocation(
    latitude,
    longitude
) {

    if (
        latitude === null ||
        latitude === undefined ||
        longitude === null ||
        longitude === undefined
    ) {
        return "Unknown";
    }

    return `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
}


function formatDate(
    timestamp
) {

    if (!timestamp) {
        return "Unknown";
    }

    const date =
        new Date(timestamp);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return timestamp;
    }

    return date.toLocaleString();
}


/* =========================
   HTML SAFETY
========================= */

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}
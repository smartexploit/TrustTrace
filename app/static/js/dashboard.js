const API_BASE = "";

const TOKEN_KEY = "trusttrace_token";
const USER_KEY = "trusttrace_user";

let products = [];
let scans = [];
let flags = [];
let users = [];
let currentUser = null;

let investigationMap = null;
let investigationMapMarkers = [];
let investigationMapLines = [];


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

    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="3"
                    class="empty-state"
                >
                    No registered products found.
                </td>
            </tr>
        `;

        return;
    }

    products.forEach(
        (product) => {
            const row =
                document.createElement("tr");

            const productCode =
                String(product.code);

            let qrActions = "";

            if (
                typeof hasRole === "function" &&
                hasRole(
                    "super_admin",
                    "brand_admin"
                )
            ) {
                qrActions = `
                    <div
                        style="
                            margin-top: 8px;
                            display: flex;
                            gap: 6px;
                            flex-wrap: wrap;
                        "
                    >
                        <button
                            type="button"
                            class="secondary-button"
                            onclick="openProductQr('${escapeHtmlAttribute(productCode)}')"
                        >
                            Generate QR
                        </button>

                        <button
                            type="button"
                            class="secondary-button"
                            onclick="downloadProductQr('${escapeHtmlAttribute(productCode)}')"
                        >
                            Download QR
                        </button>
                    </div>
                `;
            }

            row.innerHTML = `
                <td>
                    ${escapeHtml(productCode)}
                    ${qrActions}
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

            tableBody.appendChild(row);
        }
    );
}


/* =========================
   GENERATE / DISPLAY QR
========================= */

async function openProductQr(productCode) {
    const token = getToken();

    if (!token) {
        window.location.href = "/login";
        return;
    }

    const qrWindow =
        window.open(
            "",
            "_blank"
        );

    try {
        const response =
            await fetch(
                `${API_BASE}/products/${encodeURIComponent(productCode)}/qr`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        if (!response.ok) {
            if (response.status === 401) {
                clearAuthentication();

                if (qrWindow) {
                    qrWindow.close();
                }

                window.location.href =
                    "/login";

                return;
            }

            throw new Error(
                "Failed to generate QR code."
            );
        }

        const blob =
            await response.blob();

        const imageUrl =
            URL.createObjectURL(blob);

        if (qrWindow) {
            qrWindow.location.href =
                imageUrl;
        } else {
            window.open(
                imageUrl,
                "_blank"
            );
        }

        setTimeout(
            () => {
                URL.revokeObjectURL(
                    imageUrl
                );
            },
            60000
        );
    } catch (error) {
        console.error(
            "QR generation error:",
            error
        );

        if (qrWindow) {
            qrWindow.close();
        }

        alert(
            error.message ||
            "Unable to generate QR code."
        );
    }
}


/* =========================
   DOWNLOAD QR
========================= */

async function downloadProductQr(productCode) {
    const token = getToken();

    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE}/products/${encodeURIComponent(productCode)}/qr`,
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        if (!response.ok) {
            if (response.status === 401) {
                clearAuthentication();

                window.location.href =
                    "/login";

                return;
            }

            throw new Error(
                "Failed to generate QR code."
            );
        }

        const blob =
            await response.blob();

        if (
            !blob ||
            blob.size === 0
        ) {
            throw new Error(
                "QR code file is empty."
            );
        }

        const downloadUrl =
            URL.createObjectURL(blob);

        const downloadLink =
            document.createElement("a");

        downloadLink.href =
            downloadUrl;

        downloadLink.download =
            `${productCode}-trusttrace-qr.png`;

        downloadLink.style.display =
            "none";

        document.body.appendChild(
            downloadLink
        );

        downloadLink.click();

        document.body.removeChild(
            downloadLink
        );

        setTimeout(
            () => {
                URL.revokeObjectURL(
                    downloadUrl
                );
            },
            5000
        );
    } catch (error) {
        console.error(
            "QR download error:",
            error
        );

        alert(
            error.message ||
            "Unable to download QR code."
        );
    }
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
                document.createElement("tr");

            const flagged =
                Boolean(scan.flagged);

            const locationHtml =
                formatLocationWithMap(
                    scan.latitude,
                    scan.longitude,
                    scan.location_accuracy
                );

            row.innerHTML = `
                <td>
                    ${escapeHtml(scan.id)}
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
                    ${locationHtml}
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

            tableBody.appendChild(row);
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
                document.createElement("tr");

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

            const locationHtml =
                formatLocationWithMap(
                    scan.latitude,
                    scan.longitude,
                    scan.location_accuracy
                );

            row.innerHTML = `
                <td>
                    ${escapeHtml(scan.id)}
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
                    ${locationHtml}
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
                                    data-scan-id="${escapeHtmlAttribute(scan.id)}"
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

            tableBody.appendChild(row);
        }
    );

    document
        .querySelectorAll(".review-button")
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
                scans.length -
                flags.length,
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

function updateAlertBanner(hasFlags) {
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
   INVESTIGATION MAP
========================= */

function ensureLeafletLoaded() {
    return new Promise(
        (resolve, reject) => {
            if (
                typeof window.L !==
                "undefined"
            ) {
                resolve();
                return;
            }

            const existingScript =
                document.querySelector(
                    'script[data-trusttrace-leaflet]'
                );

            if (existingScript) {
                existingScript.addEventListener(
                    "load",
                    () => resolve()
                );

                existingScript.addEventListener(
                    "error",
                    () =>
                        reject(
                            new Error(
                                "Unable to load map library."
                            )
                        )
                );

                return;
            }

            if (
                !document.querySelector(
                    'link[data-trusttrace-leaflet]'
                )
            ) {
                const link =
                    document.createElement("link");

                link.rel = "stylesheet";

                link.href =
                    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

                link.integrity =
                    "sha256-p4NxAoJBhIINfQ3R5v7nXnJ6k2hQfXf5F6XQJ2h7rM=";

                link.crossOrigin = "";

                link.dataset.trusttraceLeaflet =
                    "true";

                document.head.appendChild(
                    link
                );
            }

            const script =
                document.createElement(
                    "script"
                );

            script.src =
                "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

            script.dataset.trusttraceLeaflet =
                "true";

            script.onload =
                () => resolve();

            script.onerror =
                () =>
                    reject(
                        new Error(
                            "Unable to load map library."
                        )
                    );

            document.head.appendChild(
                script
            );
        }
    );
}

function toFiniteCoordinate(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return null;
    }

    return number;
}

function hasValidCoordinates(scan) {
    const latitude =
        toFiniteCoordinate(
            scan?.latitude
        );

    const longitude =
        toFiniteCoordinate(
            scan?.longitude
        );

    return (
        latitude !== null &&
        longitude !== null &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

function calculateDistanceKm(
    latitude1,
    longitude1,
    latitude2,
    longitude2
) {
    const lat1 =
        Number(latitude1);

    const lon1 =
        Number(longitude1);

    const lat2 =
        Number(latitude2);

    const lon2 =
        Number(longitude2);

    if (
        !Number.isFinite(lat1) ||
        !Number.isFinite(lon1) ||
        !Number.isFinite(lat2) ||
        !Number.isFinite(lon2)
    ) {
        return null;
    }

    const earthRadiusKm =
        6371;

    const latDifference =
        (
            (lat2 - lat1) *
            Math.PI
        ) / 180;

    const lonDifference =
        (
            (lon2 - lon1) *
            Math.PI
        ) / 180;

    const a =
        Math.sin(
            latDifference / 2
        ) ** 2 +
        Math.cos(
            lat1 * Math.PI / 180
        ) *
        Math.cos(
            lat2 * Math.PI / 180
        ) *
        Math.sin(
            lonDifference / 2
        ) ** 2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadiusKm * c;
}

function getPreviousScan(currentScan) {
    if (!currentScan) {
        return null;
    }

    const sameProductScans =
        scans
            .filter(
                (scan) =>
                    String(scan.code) ===
                    String(currentScan.code) &&
                    Number(scan.id) !==
                    Number(currentScan.id)
            )
            .filter(
                (scan) =>
                    hasValidCoordinates(scan)
            )
            .filter(
                (scan) => {
                    const currentTime =
                        new Date(
                            currentScan.timestamp
                        ).getTime();

                    const scanTime =
                        new Date(
                            scan.timestamp
                        ).getTime();

                    return (
                        Number.isFinite(
                            currentTime
                        ) &&
                        Number.isFinite(
                            scanTime
                        ) &&
                        scanTime <
                            currentTime
                    );
                }
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.timestamp
                    ).getTime() -
                    new Date(
                        a.timestamp
                    ).getTime()
            );

    return (
        sameProductScans[0] ||
        null
    );
}

function getInvestigationMetrics(
    currentScan,
    previousScan
) {
    if (
        !currentScan ||
        !previousScan
    ) {
        return {
            distanceKm: null,
            elapsedMinutes: null,
            speedKmh: null
        };
    }

    const distanceKm =
        calculateDistanceKm(
            previousScan.latitude,
            previousScan.longitude,
            currentScan.latitude,
            currentScan.longitude
        );

    const currentTime =
        new Date(
            currentScan.timestamp
        ).getTime();

    const previousTime =
        new Date(
            previousScan.timestamp
        ).getTime();

    if (
        !Number.isFinite(
            currentTime
        ) ||
        !Number.isFinite(
            previousTime
        ) ||
        currentTime <=
            previousTime
    ) {
        return {
            distanceKm,
            elapsedMinutes: null,
            speedKmh: null
        };
    }

    const elapsedMinutes =
        (
            currentTime -
            previousTime
        ) / 60000;

    const speedKmh =
        elapsedMinutes > 0 &&
        distanceKm !== null
            ? distanceKm /
              (elapsedMinutes / 60)
            : null;

    return {
        distanceKm,
        elapsedMinutes,
        speedKmh
    };
}

function formatDistance(
    distanceKm
) {
    if (
        distanceKm === null ||
        !Number.isFinite(distanceKm)
    ) {
        return "Not available";
    }

    if (distanceKm < 1) {
        return `${Math.round(
            distanceKm * 1000
        )} m`;
    }

    return `${distanceKm.toFixed(
        2
    )} km`;
}

function formatElapsedTime(
    minutes
) {
    if (
        minutes === null ||
        !Number.isFinite(minutes)
    ) {
        return "Not available";
    }

    if (minutes < 1) {
        return `${Math.round(
            minutes * 60
        )} sec`;
    }

    if (minutes < 60) {
        return `${minutes.toFixed(
            1
        )} min`;
    }

    const hours =
        Math.floor(
            minutes / 60
        );

    const remainingMinutes =
        Math.round(
            minutes % 60
        );

    return `${hours}h ${remainingMinutes}m`;
}

function formatSpeed(
    speedKmh
) {
    if (
        speedKmh === null ||
        !Number.isFinite(speedKmh)
    ) {
        return "Not available";
    }

    return `${speedKmh.toFixed(
        1
    )} km/h`;
}

function getMovementRisk(
    scan,
    metrics
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
        return {
            level: "HIGH",
            className: "review-high"
        };
    }

    if (
        metrics.speedKmh !== null &&
        metrics.speedKmh >= 900
    ) {
        return {
            level: "HIGH",
            className: "review-high"
        };
    }

    if (
        reason.includes(
            "high scan frequency"
        )
    ) {
        return {
            level: "MEDIUM",
            className: "review-medium"
        };
    }

    if (
        reason.includes(
            "invalid product code"
        )
    ) {
        return {
            level: "MEDIUM",
            className: "review-medium"
        };
    }

    return {
        level: "LOW",
        className: "review-low"
    };
}

function injectInvestigationMapStyles() {
    if (
        document.getElementById(
            "trusttrace-investigation-map-styles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "trusttrace-investigation-map-styles";

    style.textContent = `
        .trusttrace-investigation-map {
            width: 100%;
            height: 380px;
            min-height: 300px;
            border-radius: 12px;
            overflow: hidden;
            margin-top: 18px;
            border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .trusttrace-map-section {
            margin-top: 22px;
        }

        .trusttrace-map-title {
            margin-bottom: 8px;
        }

        .trusttrace-map-subtitle {
            margin-top: 0;
            opacity: 0.75;
            font-size: 0.9rem;
        }

        .trusttrace-metric-grid {
            display: grid;
            grid-template-columns:
                repeat(
                    auto-fit,
                    minmax(150px, 1fr)
                );
            gap: 10px;
            margin-top: 16px;
        }

        .trusttrace-metric {
            padding: 12px;
            border-radius: 10px;
            background: rgba(
                255,
                255,
                255,
                0.04
            );
            border: 1px solid rgba(
                255,
                255,
                255,
                0.08
            );
        }

        .trusttrace-metric span {
            display: block;
            font-size: 0.78rem;
            opacity: 0.7;
            margin-bottom: 4px;
        }

        .trusttrace-metric strong {
            display: block;
            font-size: 1rem;
        }

        .trusttrace-activity-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 14px;
        }

        .trusttrace-activity-table th,
        .trusttrace-activity-table td {
            padding: 9px 8px;
            text-align: left;
            border-bottom: 1px solid rgba(
                255,
                255,
                255,
                0.08
            );
            font-size: 0.85rem;
        }

        .trusttrace-map-fallback {
            padding: 18px;
            border-radius: 10px;
            background: rgba(
                255,
                255,
                255,
                0.04
            );
            margin-top: 18px;
        }

        .trusttrace-map-fallback a {
            display: inline-block;
            margin-top: 8px;
        }

        @media (max-width: 700px) {
            .trusttrace-investigation-map {
                height: 300px;
            }

            .trusttrace-activity-table {
                display: block;
                overflow-x: auto;
            }
        }
    `;

    document.head.appendChild(style);
}

async function renderInvestigationMap(
    currentScan,
    previousScan
) {
    const mapContainer =
        document.getElementById(
            "investigation-map"
        );

    if (!mapContainer) {
        return;
    }

    injectInvestigationMapStyles();

    if (
        !hasValidCoordinates(
            currentScan
        )
    ) {
        mapContainer.innerHTML = `
            <div class="trusttrace-map-fallback">
                <strong>
                    Map unavailable
                </strong>

                <p>
                    This scan does not contain
                    valid geographic coordinates.
                </p>
            </div>
        `;

        return;
    }

    try {
        await ensureLeafletLoaded();

        if (
            typeof window.L ===
            "undefined"
        ) {
            throw new Error(
                "Leaflet is unavailable."
            );
        }

        if (investigationMap) {
            investigationMap.remove();
            investigationMap = null;
        }

        investigationMapMarkers = [];
        investigationMapLines = [];

        mapContainer.innerHTML = "";

        investigationMap =
            L.map(
                mapContainer,
                {
                    scrollWheelZoom: true
                }
            );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,
                attribution:
                    '&copy; OpenStreetMap contributors'
            }
        ).addTo(
            investigationMap
        );

        const currentLat =
            Number(
                currentScan.latitude
            );

        const currentLng =
            Number(
                currentScan.longitude
            );

        const currentMarker =
            L.marker([
                currentLat,
                currentLng
            ])
                .addTo(
                    investigationMap
                )
                .bindPopup(
                    `
                        <strong>
                            Current Scan
                        </strong>
                        <br>
                        Product:
                        ${escapeHtml(
                            currentScan.code
                        )}
                        <br>
                        Scan ID:
                        ${escapeHtml(
                            currentScan.id
                        )}
                        <br>
                        Accuracy:
                        ${escapeHtml(
                            formatAccuracy(
                                currentScan.location_accuracy
                            )
                        )}
                    `
                );

        investigationMapMarkers.push(
            currentMarker
        );

        if (
            currentScan.location_accuracy !==
                null &&
            currentScan.location_accuracy !==
                undefined &&
            Number.isFinite(
                Number(
                    currentScan.location_accuracy
                )
            )
        ) {
            const accuracyCircle =
                L.circle(
                    [
                        currentLat,
                        currentLng
                    ],
                    {
                        radius:
                            Number(
                                currentScan.location_accuracy
                            ),
                        weight: 1,
                        fillOpacity: 0.08
                    }
                )
                    .addTo(
                        investigationMap
                    )
                    .bindPopup(
                        `
                            Location accuracy:
                            ${escapeHtml(
                                formatAccuracy(
                                    currentScan.location_accuracy
                                )
                            )}
                        `
                    );

            investigationMapMarkers.push(
                accuracyCircle
            );
        }

        const boundsPoints = [
            [
                currentLat,
                currentLng
            ]
        ];

        if (
            previousScan &&
            hasValidCoordinates(
                previousScan
            )
        ) {
            const previousLat =
                Number(
                    previousScan.latitude
                );

            const previousLng =
                Number(
                    previousScan.longitude
                );

            const previousMarker =
                L.marker(
                    [
                        previousLat,
                        previousLng
                    ]
                )
                    .addTo(
                        investigationMap
                    )
                    .bindPopup(
                        `
                            <strong>
                                Previous Scan
                            </strong>
                            <br>
                            Product:
                            ${escapeHtml(
                                previousScan.code
                            )}
                            <br>
                            Scan ID:
                            ${escapeHtml(
                                previousScan.id
                            )}
                            <br>
                            Time:
                            ${escapeHtml(
                                formatDate(
                                    previousScan.timestamp
                                )
                            )}
                            <br>
                            Accuracy:
                            ${escapeHtml(
                                formatAccuracy(
                                    previousScan.location_accuracy
                                )
                            )}
                        `
                    );

            investigationMapMarkers.push(
                previousMarker
            );

            boundsPoints.push([
                previousLat,
                previousLng
            ]);

            const movementLine =
                L.polyline(
                    [
                        [
                            previousLat,
                            previousLng
                        ],
                        [
                            currentLat,
                            currentLng
                        ]
                    ],
                    {
                        weight: 4,
                        opacity: 0.8,
                        dashArray:
                            "8, 8"
                    }
                )
                    .addTo(
                        investigationMap
                    );

            investigationMapLines.push(
                movementLine
            );
        }

        if (
            boundsPoints.length >
            1
        ) {
            investigationMap.fitBounds(
                boundsPoints,
                {
                    padding: [
                        40,
                        40
                    ]
                }
            );
        } else {
            investigationMap.setView(
                [
                    currentLat,
                    currentLng
                ],
                15
            );
        }

        setTimeout(
            () => {
                if (investigationMap) {
                    investigationMap.invalidateSize();
                }
            },
            200
        );
    } catch (error) {
        console.error(
            "Investigation map error:",
            error
        );

        const mapUrl =
            getMapUrl(
                currentScan.latitude,
                currentScan.longitude
            );

        mapContainer.innerHTML = `
            <div class="trusttrace-map-fallback">
                <strong>
                    Interactive map could not be loaded.
                </strong>

                <p>
                    The scan location is still available.
                </p>

                ${
                    mapUrl
                        ? `
                            <a
                                href="${escapeHtmlAttribute(mapUrl)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open location in Google Maps
                            </a>
                        `
                        : ""
                }
            </div>
        `;
    }
}

function renderRecentActivity(
    currentScan
) {
    const container =
        document.getElementById(
            "investigation-recent-activity"
        );

    if (!container) {
        return;
    }

    const relatedScans =
        scans
            .filter(
                (scan) =>
                    String(scan.code) ===
                    String(currentScan.code)
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.timestamp
                    ).getTime() -
                    new Date(
                        a.timestamp
                    ).getTime()
            )
            .slice(0, 8);

    if (!relatedScans.length) {
        container.innerHTML = `
            <p>
                No recent activity found for this product.
            </p>
        `;

        return;
    }

    container.innerHTML = `
        <table class="trusttrace-activity-table">
            <thead>
                <tr>
                    <th>Scan</th>
                    <th>Time</th>
                    <th>Location</th>
                    <th>Accuracy</th>
                    <th>Status</th>
                </tr>
            </thead>

            <tbody>
                ${relatedScans
                    .map(
                        (scan) => `
                            <tr>
                                <td>
                                    #${escapeHtml(
                                        scan.id
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        formatDate(
                                            scan.timestamp
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        formatLocation(
                                            scan.latitude,
                                            scan.longitude
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        formatAccuracy(
                                            scan.location_accuracy
                                        )
                                    )}
                                </td>

                                <td>
                                    <span
                                        class="status-badge ${
                                            scan.flagged
                                                ? "flagged"
                                                : "safe"
                                        }"
                                    >
                                        ${
                                            scan.flagged
                                                ? "Flagged"
                                                : "Safe"
                                        }
                                    </span>
                                </td>
                            </tr>
                        `
                    )
                    .join("")}
            </tbody>
        </table>
    `;
}

function buildInvestigationMapSection(
    currentScan,
    previousScan
) {
    return `
        <div class="trusttrace-map-section">

            <div class="trusttrace-map-title">
                <h3>
                    Investigation Map
                </h3>

                <p class="trusttrace-map-subtitle">
                    Geographic relationship between
                    this scan and the previous scan
                    of the same product.
                </p>
            </div>

            <div
                id="investigation-map"
                class="trusttrace-investigation-map"
            ></div>
        </div>
    `;
}

function buildInvestigationMetrics(
    currentScan,
    previousScan,
    metrics,
    risk
) {
    return `
        <div class="trusttrace-metric-grid">

            <div class="trusttrace-metric">
                <span>
                    Previous Scan
                </span>

                <strong>
                    ${
                        previousScan
                            ? `#${escapeHtml(
                                previousScan.id
                            )}`
                            : "None"
                    }
                </strong>
            </div>

            <div class="trusttrace-metric">
                <span>
                    Distance
                </span>

                <strong>
                    ${escapeHtml(
                        formatDistance(
                            metrics.distanceKm
                        )
                    )}
                </strong>
            </div>

            <div class="trusttrace-metric">
                <span>
                    Elapsed Time
                </span>

                <strong>
                    ${escapeHtml(
                        formatElapsedTime(
                            metrics.elapsedMinutes
                        )
                    )}
                </strong>
            </div>

            <div class="trusttrace-metric">
                <span>
                    Movement Speed
                </span>

                <strong>
                    ${escapeHtml(
                        formatSpeed(
                            metrics.speedKmh
                        )
                    )}
                </strong>
            </div>

            <div class="trusttrace-metric">
                <span>
                    Current Accuracy
                </span>

                <strong>
                    ${escapeHtml(
                        formatAccuracy(
                            currentScan.location_accuracy
                        )
                    )}
                </strong>
            </div>

            <div class="trusttrace-metric">
                <span>
                    Risk Level
                </span>

                <strong
                    class="${escapeHtml(
                        risk.className
                    )}"
                >
                    ${escapeHtml(
                        risk.level
                    )}
                </strong>
            </div>

        </div>
    `;
}

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

    const previousScan =
        getPreviousScan(scan);

    const metrics =
        getInvestigationMetrics(
            scan,
            previousScan
        );

    const risk =
        getMovementRisk(
            scan,
            metrics
        );

    const locationHtml =
        formatLocationWithMap(
            scan.latitude,
            scan.longitude,
            scan.location_accuracy
        );

    content.innerHTML = `
        <div class="investigation-grid">

            <div class="investigation-item">
                <span>
                    Scan ID
                </span>

                <strong>
                    ${escapeHtml(scan.id)}
                </strong>
            </div>

            <div class="investigation-item">
                <span>
                    Product Code
                </span>

                <strong>
                    ${escapeHtml(
                        scan.code
                    )}
                </strong>
            </div>

            <div class="investigation-item">
                <span>
                    Timestamp
                </span>

                <strong>
                    ${formatDate(
                        scan.timestamp
                    )}
                </strong>
            </div>

            <div class="investigation-item">
                <span>
                    Location
                </span>

                <strong>
                    ${locationHtml}
                </strong>
            </div>

            <div class="investigation-item">
                <span>
                    Location Accuracy
                </span>

                <strong>
                    ${escapeHtml(
                        formatAccuracy(
                            scan.location_accuracy
                        )
                    )}
                </strong>
            </div>

            <div class="investigation-item">
                <span>
                    Current Review Status
                </span>

                <strong>
                    ${escapeHtml(
                        scan.review_status ||
                        "PENDING"
                    )}
                </strong>
            </div>

            <div class="investigation-reason">
                <span>
                    Detection Reason
                </span>

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

            ${buildInvestigationMetrics(
                scan,
                previousScan,
                metrics,
                risk
            )}

        </div>

        ${buildInvestigationMapSection(
            scan,
            previousScan
        )}

        <div
            style="
                margin-top: 22px;
            "
        >
            <h3>
                Recent Product Activity
            </h3>

            <p
                style="
                    opacity: 0.75;
                    font-size: 0.9rem;
                "
            >
                Recent scan history for
                ${escapeHtml(scan.code)}.
            </p>

            <div
                id="investigation-recent-activity"
            ></div>
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

        <div class="investigation-actions">

            <div class="review-actions">

                <button
                    type="button"
                    class="primary-button"
                    onclick="submitReview(
                        ${Number(scan.id)},
                        'REVIEWED'
                    )"
                >
                    Confirm Review
                </button>

                <button
                    type="button"
                    class="secondary-button"
                    onclick="submitReview(
                        ${Number(scan.id)},
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

    renderRecentActivity(scan);

    requestAnimationFrame(
        async () => {
            await renderInvestigationMap(
                scan,
                previousScan
            );
        }
    );
}

function closeInvestigation() {
    const panel =
        document.getElementById(
            "investigation-panel"
        );

    if (!panel) {
        return;
    }

    if (investigationMap) {
        investigationMap.remove();
        investigationMap = null;
    }

    investigationMapMarkers = [];
    investigationMapLines = [];

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
                    headers:
                        authHeaders({
                            "Content-Type":
                                "application/json"
                        }),
                    body:
                        JSON.stringify({
                            review_status:
                                reviewStatus,
                            review_note:
                                reviewNote ||
                                null
                        })
                }
            );

        if (
            response.status ===
            401
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
                    headers:
                        authHeaders({
                            "Content-Type":
                                "application/json"
                        }),
                    body:
                        JSON.stringify({
                            code,
                            product_name:
                                productName,
                            batch_id:
                                batchId
                        })
                }
            );

        if (
            response.status ===
            401
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

    const accuracyElement =
        document.getElementById(
            "location-accuracy"
        );

    const locationAccuracy =
        accuracyElement
            ? accuracyElement.value
            : "";

    const message =
        document.getElementById(
            "scan-message"
        );

    const scanPayload = {
        code,

        timestamp,

        latitude:
            latitude !== ""
                ? Number(latitude)
                : null,

        longitude:
            longitude !== ""
                ? Number(longitude)
                : null
    };

    /*
     * Only send location_accuracy
     * when a value is actually available.
     *
     * This keeps compatibility with
     * older scan forms.
     */

    if (
        locationAccuracy !== ""
    ) {
        scanPayload.location_accuracy =
            Number(
                locationAccuracy
            );
    }

    try {
        const response =
            await fetch(
                `${API_BASE}/scan/`,
                {
                    method: "POST",
                    headers:
                        authHeaders({
                            "Content-Type":
                                "application/json"
                        }),
                    body:
                        JSON.stringify(
                            scanPayload
                        )
                }
            );

        if (
            response.status ===
            401
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

    if (
        response.status ===
        401
    ) {
        handleUnauthorized();
        return;
    }

    if (
        response.status ===
        403
    ) {
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
                document.createElement("tr");

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
                    ${escapeHtml(
                        user.id
                    )}
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

            tableBody.appendChild(row);
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
                    headers:
                        authHeaders({
                            "Content-Type":
                                "application/json"
                        }),
                    body:
                        JSON.stringify({
                            email,
                            password,
                            role
                        })
                }
            );

        if (
            response.status ===
            401
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
   LOCATION FORMATTING
========================= */

function formatLocation(
    latitude,
    longitude
) {
    if (
        latitude === null ||
        latitude === undefined ||
        longitude === null ||
        longitude === undefined ||
        latitude === "" ||
        longitude === ""
    ) {
        return "Unknown";
    }

    const lat =
        Number(latitude);

    const lng =
        Number(longitude);

    if (
        Number.isNaN(lat) ||
        Number.isNaN(lng)
    ) {
        return "Unknown";
    }

    return `${lat.toFixed(
        4
    )}, ${lng.toFixed(4)}`;
}

function formatAccuracy(
    accuracy
) {
    if (
        accuracy === null ||
        accuracy === undefined ||
        accuracy === ""
    ) {
        return "Not available";
    }

    const numericAccuracy =
        Number(accuracy);

    if (
        Number.isNaN(
            numericAccuracy
        ) ||
        numericAccuracy < 0
    ) {
        return "Not available";
    }

    if (numericAccuracy < 1) {
        return `±${numericAccuracy.toFixed(
            2
        )} m`;
    }

    if (numericAccuracy < 10) {
        return `±${numericAccuracy.toFixed(
            1
        )} m`;
    }

    return `±${Math.round(
        numericAccuracy
    )} m`;
}

function getMapUrl(
    latitude,
    longitude
) {
    if (
        latitude === null ||
        latitude === undefined ||
        longitude === null ||
        longitude === undefined ||
        latitude === "" ||
        longitude === ""
    ) {
        return null;
    }

    const lat =
        Number(latitude);

    const lng =
        Number(longitude);

    if (
        Number.isNaN(lat) ||
        Number.isNaN(lng)
    ) {
        return null;
    }

    return `https://www.google.com/maps?q=${encodeURIComponent(
        `${lat},${lng}`
    )}`;
}

function formatLocationWithMap(
    latitude,
    longitude,
    accuracy = null
) {
    const location =
        formatLocation(
            latitude,
            longitude
        );

    if (location === "Unknown") {
        return `
            <div>
                <div>
                    Unknown
                </div>

                ${
                    accuracy !== null &&
                    accuracy !== undefined &&
                    accuracy !== ""
                        ? `
                            <small>
                                Accuracy:
                                ${escapeHtml(
                                    formatAccuracy(
                                        accuracy
                                    )
                                )}
                            </small>
                        `
                        : ""
                }
            </div>
        `;
    }

    const mapUrl =
        getMapUrl(
            latitude,
            longitude
        );

    return `
        <div
            style="
                display: flex;
                flex-direction: column;
                gap: 3px;
            "
        >
            <span>
                ${escapeHtml(location)}
            </span>

            ${
                accuracy !== null &&
                accuracy !== undefined &&
                accuracy !== ""
                    ? `
                        <small>
                            Accuracy:
                            ${escapeHtml(
                                formatAccuracy(
                                    accuracy
                                )
                            )}
                        </small>
                    `
                    : ""
            }

            ${
                mapUrl
                    ? `
                        <a
                            href="${escapeHtmlAttribute(
                                mapUrl
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                            style="
                                display: inline-block;
                                margin-top: 2px;
                                font-size: 0.85em;
                            "
                        >
                            Open map
                        </a>
                    `
                    : ""
            }
        </div>
    `;
}


/* =========================
   DATE FORMATTING
========================= */

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

function escapeHtmlAttribute(
    value
) {
    return escapeHtml(value);
}
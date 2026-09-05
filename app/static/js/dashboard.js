const API_BASE = "";

let products = [];
let scans = [];
let flags = [];

document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();

    const refreshButton = document.getElementById("refresh-btn");
    if (refreshButton) {
        refreshButton.addEventListener("click", loadDashboard);
    }

    const productForm = document.getElementById("product-form");
    if (productForm) {
        productForm.addEventListener("submit", handleProductSubmit);
    }

    const scanForm = document.getElementById("scan-form");
    if (scanForm) {
        scanForm.addEventListener("submit", handleScanSubmit);
    }

    const closeButton = document.getElementById("close-investigation");
    if (closeButton) {
        closeButton.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            const panel = document.getElementById("investigation-panel");

            if (panel) {
                panel.classList.add("hidden");
                panel.style.display = "none";
            }
        });
    }

    document.addEventListener("click", (event) => {
        const target = event.target;

        if (!target) {
            return;
        }

        const reviewButton = target.closest(".review-button");

        if (reviewButton) {
            const scanId = reviewButton.dataset.scanId;

            if (scanId) {
                openInvestigation(Number(scanId));
            }
        }
    });
});


async function loadDashboard() {
    await Promise.all([
        loadProducts(),
        loadScans(),
        loadFlags()
    ]);

    updateSummary();
    updateApiStatus();
}


async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products/`);

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        products = await response.json();

        renderProducts();
    } catch (error) {
        console.error("Error loading products:", error);
    }
}


async function loadScans() {
    try {
        const response = await fetch(`${API_BASE}/scan/`);

        if (!response.ok) {
            throw new Error("Failed to load scans");
        }

        scans = await response.json();

        renderScans();
    } catch (error) {
        console.error("Error loading scans:", error);
    }
}


async function loadFlags() {
    try {
        const response = await fetch(`${API_BASE}/scan/flags`);

        if (!response.ok) {
            throw new Error("Failed to load flagged scans");
        }

        flags = await response.json();

        console.log("Flagged scans received:", flags);

        renderFlags();
    } catch (error) {
        console.error("Error loading flagged scans:", error);
    }
}


function updateSummary() {
    const totalScansElement = document.getElementById("total-scans");
    const flaggedScansElement = document.getElementById("flagged-scans");
    const safeScansElement = document.getElementById("safe-scans");
    const totalProductsElement = document.getElementById("total-products");

    const totalScanCount = scans.length;

    const flaggedScanCount = scans.filter(
        (scan) => scan.flagged === true
    ).length;

    const safeScanCount = totalScanCount - flaggedScanCount;

    if (totalScansElement) {
        totalScansElement.textContent = totalScanCount;
    }

    if (flaggedScansElement) {
        flaggedScansElement.textContent = flaggedScanCount;
    }

    if (safeScansElement) {
        safeScansElement.textContent = safeScanCount;
    }

    if (totalProductsElement) {
        totalProductsElement.textContent = products.length;
    }
}


function updateApiStatus() {
    const apiStatus = document.getElementById("api-status");

    if (!apiStatus) {
        return;
    }

    apiStatus.textContent = "API Connected";

    apiStatus.classList.remove("offline");
    apiStatus.classList.add("online");
}


function renderProducts() {
    const tableBody = document.getElementById("products-table-body");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-state">
                    No registered products found.
                </td>
            </tr>
        `;

        return;
    }

    products.forEach((product) => {
        const row = document.createElement("tr");

        const code = encodeURIComponent(product.code);

        const qrUrl = `${API_BASE}/products/${code}/qr`;

        row.innerHTML = `
            <td>
                ${escapeHtml(product.code)}

                <div style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">

                    <a
                        href="${qrUrl}"
                        target="_blank"
                        rel="noopener"
                        class="secondary-button"
                        style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none;"
                    >
                        View QR
                    </a>

                    <a
                        href="${qrUrl}"
                        download="${escapeHtml(product.code)}-trusttrace-qr.png"
                        class="secondary-button"
                        style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none;"
                    >
                        Download QR
                    </a>

                </div>
            </td>

            <td>
                ${escapeHtml(product.product_name)}
            </td>

            <td>
                ${escapeHtml(product.batch_id)}
            </td>
        `;

        tableBody.appendChild(row);
    });
}


function renderScans() {
    const tableBody = document.getElementById("scans-table-body");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (scans.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No scan events found.
                </td>
            </tr>
        `;

        return;
    }

    scans.forEach((scan) => {
        const row = document.createElement("tr");

        const statusClass = scan.flagged
            ? "status-flagged"
            : "status-safe";

        const statusText = scan.flagged
            ? "Flagged"
            : "Safe";

        row.innerHTML = `
            <td>
                ${scan.id}
            </td>

            <td>
                ${escapeHtml(scan.code)}
            </td>

            <td>
                ${formatDate(scan.timestamp)}
            </td>

            <td>
                ${formatLocation(
                    scan.latitude,
                    scan.longitude
                )}
            </td>

            <td>
                <span class="status-badge ${scan.flagged ? "flagged" : "safe"}">
                    ${statusText}
                </span>
            </td>

            <td class="${statusClass}">
                ${
                    scan.flag_reason
                        ? escapeHtml(scan.flag_reason)
                        : "No anomaly detected"
                }
            </td>
        `;

        tableBody.appendChild(row);
    });
}


function renderFlags() {
    const tableBody = document.getElementById("flags-table-body");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (flags.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    No flagged scans found.
                </td>
            </tr>
        `;

        updateAlertBanner(false);

        return;
    }

    updateAlertBanner(true);

    flags.forEach((scan) => {
        const row = document.createElement("tr");

        const reviewStatus = scan.review_status || "PENDING";

        let reviewStatusClass = "review-required";

        if (
            reviewStatus === "REVIEWED" ||
            reviewStatus === "DISMISSED"
        ) {
            reviewStatusClass = "status-safe";
        }

        const riskClass = getRiskClass(scan);

        const riskText = getRiskText(scan);

        row.innerHTML = `
            <td>
                ${scan.id}
            </td>

            <td>
                ${escapeHtml(scan.code)}
            </td>

            <td>
                ${formatDate(scan.timestamp)}
            </td>

            <td>
                ${formatLocation(
                    scan.latitude,
                    scan.longitude
                )}
            </td>

            <td>
                <span class="status-badge flagged">
                    Flagged
                </span>
            </td>

            <td>
                <span class="status-badge ${riskClass}">
                    ${riskText}
                </span>
            </td>

            <td>
                <span class="${reviewStatusClass}">
                    ${escapeHtml(reviewStatus)}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="review-button"
                    data-scan-id="${scan.id}"
                >
                    Review
                </button>
            </td>

            <td class="review-reason">
                ${
                    scan.flag_reason
                        ? escapeHtml(scan.flag_reason)
                        : "No detection reason"
                }
            </td>
        `;

        tableBody.appendChild(row);
    });
}


function updateAlertBanner(hasFlags) {
    const banner = document.getElementById("alert-banner");

    const title = document.getElementById("alert-title");

    const description = document.getElementById("alert-description");

    if (!banner) {
        return;
    }

    banner.classList.remove(
        "hidden",
        "alert-warning",
        "alert-safe"
    );

    if (hasFlags) {
        banner.classList.add("alert-warning");

        if (title) {
            title.textContent =
                "Suspicious activity detected";
        }

        if (description) {
            description.textContent =
                `${flags.length} flagged scan event${
                    flags.length === 1 ? "" : "s"
                } require review.`;
        }
    } else {
        banner.classList.add("alert-safe");

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


function openInvestigation(scanId) {
    const panel =
        document.getElementById("investigation-panel");

    const content =
        document.getElementById("investigation-content");

    if (!panel || !content) {
        console.error(
            "Investigation panel or content not found."
        );

        return;
    }

    const scan = scans.find(
        (item) => Number(item.id) === Number(scanId)
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
                <strong>${scan.id}</strong>
            </div>

            <div class="investigation-item">
                <span>Product Code</span>
                <strong>
                    ${escapeHtml(scan.code)}
                </strong>
            </div>

            <div class="investigation-item">
                <span>Timestamp</span>
                <strong>
                    ${formatDate(scan.timestamp)}
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
                        scan.review_status || "PENDING"
                    )}
                </strong>
            </div>

            <div class="investigation-reason">
                <span>Detection Reason</span>

                <p>
                    ${
                        scan.flag_reason
                            ? escapeHtml(scan.flag_reason)
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
                    onclick="submitReview(${scan.id}, 'REVIEWED')"
                >
                    Confirm Review
                </button>

                <button
                    type="button"
                    class="secondary-button"
                    onclick="submitReview(${scan.id}, 'DISMISSED')"
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

    panel.classList.remove("hidden");

    panel.style.display = "block";

    panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function closeInvestigation() {
    const panel =
        document.getElementById("investigation-panel");

    if (!panel) {
        console.error(
            "Investigation panel not found."
        );

        return;
    }

    panel.classList.add("hidden");

    panel.style.display = "none";
}


async function submitReview(scanId, reviewStatus) {
    const noteElement =
        document.getElementById("review-note");

    const messageElement =
        document.getElementById("review-message");

    const reviewNote = noteElement
        ? noteElement.value.trim()
        : "";

    try {
        const response = await fetch(
            `${API_BASE}/scan/${scanId}/review`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    review_status: reviewStatus,
                    review_note: reviewNote || null
                })
            }
        );

        const data = await response.json();

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

        openInvestigation(scanId);

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


async function handleProductSubmit(event) {
    event.preventDefault();

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
        const response = await fetch(
            `${API_BASE}/products/`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    code,
                    product_name: productName,
                    batch_id: batchId
                })
            }
        );

        const data = await response.json();

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


async function handleScanSubmit(event) {
    event.preventDefault();

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
        const response = await fetch(
            `${API_BASE}/scan/`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    code,
                    timestamp,
                    latitude: Number(latitude),
                    longitude: Number(longitude)
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail ||
                "Failed to submit scan"
            );
        }

        if (message) {
            message.textContent = data.flagged
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


function getRiskClass(scan) {
    const reason =
        (scan.flag_reason || "").toLowerCase();

    if (reason.includes("impossible travel")) {
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


function getRiskText(scan) {
    const reason =
        (scan.flag_reason || "").toLowerCase();

    if (reason.includes("impossible travel")) {
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


function formatLocation(latitude, longitude) {
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


function formatDate(timestamp) {
    if (!timestamp) {
        return "Unknown";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return timestamp;
    }

    return date.toLocaleString();
}


function escapeHtml(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
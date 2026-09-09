const TOKEN_KEY = "trusttrace_token";
const USER_KEY = "trusttrace_user";

function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function saveUser(user) {
    localStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
    );
}

function getUser() {
    const user = localStorage.getItem(USER_KEY);

    if (!user) {
        return null;
    }

    return JSON.parse(user);
}

async function loadCurrentUser() {
    const token = getToken();

    if (!token) {
        return null;
    }

    try {
        const response = await fetch("/auth/me", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            removeToken();
            return null;
        }

        const user = await response.json();

        saveUser(user);

        return user;

    } catch {
        removeToken();
        return null;
    }
}

function hasRole(...roles) {
    const user = getUser();

    if (!user) {
        return false;
    }

    return roles.includes(user.role);
}

function logout() {
    removeToken();
    window.location.href = "/login";
}
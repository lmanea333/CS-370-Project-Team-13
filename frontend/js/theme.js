// Name used to save the theme in the browser
const THEME_STORAGE_KEY = "timeshift-theme";


// Get the user's saved theme
function getSavedTheme() {
    const savedTheme =
        localStorage.getItem(THEME_STORAGE_KEY);

    // Only accept the three themes our app supports
    if (
        savedTheme === "light" ||
        savedTheme === "dark" ||
        savedTheme === "system"
    ) {
        return savedTheme;
    }

    // Old themes such as neutral, sage, or ocean
    // will automatically become System mode
    return "system";
}


// Apply a theme to the current page
function applyTheme(theme) {
    if (theme === "light" || theme === "dark") {
        document.documentElement.dataset.theme = theme;
    } else {
        // No data-theme means theme.css follows
        // the computer's light/dark setting
        document.documentElement.removeAttribute(
            "data-theme"
        );
    }
}


// Save and apply a new theme
function saveTheme(theme) {
    localStorage.setItem(
        THEME_STORAGE_KEY,
        theme
    );

    applyTheme(theme);
}


// Apply the saved theme as soon as this file loads
const currentTheme = getSavedTheme();
applyTheme(currentTheme);


// Allow Settings and other files to use these functions
export {
    getSavedTheme,
    applyTheme,
    saveTheme
};
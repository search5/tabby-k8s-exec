// sphinx-book-theme renders its own copy of the mobile sidebar-toggle button
// (".primary-toggle" / ".secondary-toggle") inside the article header, in
// addition to the one pydata-sphinx-theme already places in the navbar. Two
// elements now share each class, but pydata-sphinx-theme's own script wires
// its dialog-opening click handler with `document.querySelector(...)`
// (singular) -- it only ever binds to the FIRST match, which stays
// "display: none" under this theme's layout. The extra button that is
// actually visible on narrow/mobile viewports ends up with no click handler
// at all, so tapping it does nothing. Forward its clicks to the hidden,
// correctly-wired button so the existing open-modal logic runs.
//
// The visible button also carries a Bootstrap tooltip (data-bs-toggle), which
// on touch devices can make a real user tap register as a hover instead of a
// click. Disposing the tooltip avoids that on top of the fix above.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar-toggle').forEach((btn) => {
        if (window.bootstrap && bootstrap.Tooltip) {
            bootstrap.Tooltip.getInstance(btn)?.dispose()
        }
        btn.removeAttribute('data-bs-toggle')
        btn.removeAttribute('title')
        btn.removeAttribute('data-bs-original-title')
    })

    ;['primary-toggle', 'secondary-toggle'].forEach((cls) => {
        const toggles = document.querySelectorAll(`.${cls}`)
        const wired = toggles[0]
        if (!wired) return
        Array.from(toggles).slice(1).forEach((extra) => {
            extra.addEventListener('click', (event) => {
                event.preventDefault()
                wired.click()
            })
        })
    })
})

// Fallback clipboard copy method
function fallbackCopyToClipboard(text: string) {
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
            console.log("Text copied to clipboard (fallback method):", text);
        } else {
            throw new Error("Copy command failed");
        }
    } catch (err) {
        console.error("Fallback copy failed:", err);

        // If we're in Electron, try using the Electron clipboard API
        if (window.electronAPI?.copyToClipboard) {
            window.electronAPI.copyToClipboard(text);
            console.log("Text copied using Electron API:", text);
        }
    }
}

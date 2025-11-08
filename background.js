chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only send message when URL changes and page is fully loaded
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.includes("youtube.com/watch")
  ) {
    try {
      const url = new URL(tab.url);
      const videoId = url.searchParams.get("v");

      if (videoId) {
        chrome.tabs
          .sendMessage(tabId, {
            type: "NEW",
            videoId: videoId,
          })
          .catch((error) => {
            // Content script might not be ready yet, ignore error
            console.log("Content script not ready:", error);
          });
      }
    } catch (error) {
      console.error("Error parsing YouTube URL:", error);
    }
  }
});

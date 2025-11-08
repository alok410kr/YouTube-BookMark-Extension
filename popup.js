// adding a new bookmark row to the popup
import { getCurrentTab } from "./utils.js";

const addNewBookmark = (bookmarkElement, bookmark, index) => {
  const bookmarkTitleElement = document.createElement("div");
  const newBookmarkElement = document.createElement("div");
  const controlElement = document.createElement("div");

  bookmarkTitleElement.textContent = bookmark.desc;
  bookmarkTitleElement.className = "bookmark-title";

  controlElement.className = "bookmark-controls";

  // Use index to ensure unique IDs even if timestamps are the same
  newBookmarkElement.id = "bookmark-" + bookmark.time + "-" + index;
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.setAttribute("timestamp", bookmark.time);

  setBookmarkAttributes("play-button", onPlay, controlElement);
  setBookmarkAttributes("delete", onDelete, controlElement);

  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(controlElement);
  bookmarkElement.appendChild(newBookmarkElement);
};

const viewBookmarks = (currentBookmarks = []) => {
  const bookmarkElement = document.getElementById("bookmarks");
  if (!bookmarkElement) return;

  bookmarkElement.innerHTML = "";

  if (currentBookmarks.length > 0) {
    currentBookmarks.forEach((bookmark, index) => {
      addNewBookmark(bookmarkElement, bookmark, index);
    });
  } else {
    bookmarkElement.innerHTML =
      '<div class="row" style="padding: 10px; text-align: center; color: #666;">' +
      "No bookmarks yet!<br>" +
      '<span style="font-size: 11px; margin-top: 5px; display: block; opacity: 0.7;">' +
      "Click the bookmark button on the video player to add one.</span>" +
      "</div>";
  }
};

const onPlay = async (e) => {
  const bookmarkElement = e.target.closest(".bookmark");
  if (!bookmarkElement) return;

  const bookmarkTime = parseFloat(bookmarkElement.getAttribute("timestamp"));

  if (isNaN(bookmarkTime)) {
    console.error("Invalid timestamp:", bookmarkTime);
    return;
  }

  try {
    const currentTab = await getCurrentTab();

    if (!currentTab || !currentTab.id) {
      console.error("No active tab found");
      return;
    }

    chrome.tabs.sendMessage(currentTab.id, {
      type: "PLAY",
      value: bookmarkTime,
    });
  } catch (error) {
    console.error("Error sending play message:", error);
  }
};

const onDelete = async (e) => {
  const bookmarkElement = e.target.closest(".bookmark");
  if (!bookmarkElement) return;

  const bookmarkTime = parseFloat(bookmarkElement.getAttribute("timestamp"));

  if (isNaN(bookmarkTime)) {
    console.error("Invalid timestamp:", bookmarkTime);
    return;
  }

  // Remove from UI immediately for better UX
  bookmarkElement.remove();

  try {
    const currentTab = await getCurrentTab();

    if (!currentTab || !currentTab.id) {
      console.error("No active tab found");
      // Restore the element if we can't delete
      document.getElementById("bookmarks").appendChild(bookmarkElement);
      return;
    }

    chrome.tabs.sendMessage(
      currentTab.id,
      {
        type: "DELETE",
        value: bookmarkTime,
      },
      (updatedBookmarks) => {
        // Refresh bookmarks list after deletion
        if (chrome.runtime.lastError) {
          console.error("Error deleting bookmark:", chrome.runtime.lastError);
          // Restore the element if deletion failed
          document.getElementById("bookmarks").appendChild(bookmarkElement);
        } else if (updatedBookmarks) {
          viewBookmarks(updatedBookmarks);
        }
      }
    );
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    // Restore the element if deletion failed
    document.getElementById("bookmarks").appendChild(bookmarkElement);
  }
};

const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
  const controlElement = document.createElement("img");
  controlElement.src = "assets/" + src + ".png";
  controlElement.title = src;
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const currentTab = await getCurrentTab();

    if (!currentTab || !currentTab.url) {
      throw new Error("No active tab found");
    }

    const url = new URL(currentTab.url);
    const currentVideo = url.searchParams.get("v");

    if (
      url.hostname.includes("youtube.com") &&
      url.pathname === "/watch" &&
      currentVideo
    ) {
      chrome.storage.sync.get([currentVideo], (data) => {
        if (chrome.runtime.lastError) {
          console.error("Error loading bookmarks:", chrome.runtime.lastError);
          return;
        }

        let currentVideoBookmarks = [];
        try {
          currentVideoBookmarks = data[currentVideo]
            ? JSON.parse(data[currentVideo])
            : [];
        } catch (parseError) {
          console.error("Error parsing bookmarks:", parseError);
          currentVideoBookmarks = [];
        }

        viewBookmarks(currentVideoBookmarks);
      });
    } else {
      const container = document.getElementsByClassName("container")[0];
      if (container) {
        container.innerHTML =
          '<div class="title" style="text-align: center; padding: 20px;">' +
          "This is not a YouTube video page!</div>";
      }
    }
  } catch (error) {
    console.error("Error initializing popup:", error);
    const container = document.getElementsByClassName("container")[0];
    if (container) {
      container.innerHTML =
        '<div class="title" style="text-align: center; padding: 20px; color: #d32f2f;">' +
        "Error loading extension. Please refresh the page.</div>";
    }
  }
});

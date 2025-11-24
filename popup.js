// adding a new bookmark row to the popup
import { getCurrentTab } from "./utils.js";

let allBookmarks = [];
let currentVideoId = "";

const addNewBookmark = (bookmarkElement, bookmark, index) => {
  const bookmarkTitleElement = document.createElement("div");
  const newBookmarkElement = document.createElement("div");
  const controlElement = document.createElement("div");

  bookmarkTitleElement.textContent = bookmark.desc;
  bookmarkTitleElement.className = "bookmark-title";
  bookmarkTitleElement.title = "Double-click to edit";

  // Double-click to edit
  bookmarkTitleElement.addEventListener("dblclick", () => {
    onEdit(newBookmarkElement, bookmark);
  });

  controlElement.className = "bookmark-controls";

  // Use bookmark ID for unique identification
  const uniqueId = bookmark.id || "bookmark-" + bookmark.time + "-" + index;
  newBookmarkElement.id = uniqueId;
  newBookmarkElement.className = "bookmark";
  newBookmarkElement.setAttribute("timestamp", bookmark.time);
  newBookmarkElement.setAttribute("bookmark-id", bookmark.id || "");

  setBookmarkAttributes("play-button", onPlay, controlElement);
  setBookmarkAttributes("edit", onEditClick, controlElement);
  setBookmarkAttributes("delete", onDelete, controlElement);

  newBookmarkElement.appendChild(bookmarkTitleElement);
  newBookmarkElement.appendChild(controlElement);
  bookmarkElement.appendChild(newBookmarkElement);
};

const viewBookmarks = (currentBookmarks = []) => {
  allBookmarks = currentBookmarks;
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
      "Click the bookmark button on the video player (Ctrl+Shift+B)</span>" +
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
  const bookmarkId = bookmarkElement.getAttribute("bookmark-id");

  if (isNaN(bookmarkTime)) {
    console.error("Invalid timestamp:", bookmarkTime);
    return;
  }

  // Confirm deletion
  if (!confirm("Delete this bookmark?")) {
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
        bookmarkId: bookmarkId,
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

const onEditClick = (e) => {
  const bookmarkElement = e.target.closest(".bookmark");
  if (!bookmarkElement) return;
  
  const bookmark = allBookmarks.find(
    (b) => (b.id && b.id === bookmarkElement.getAttribute("bookmark-id")) ||
           b.time === parseFloat(bookmarkElement.getAttribute("timestamp"))
  );
  
  if (bookmark) {
    onEdit(bookmarkElement, bookmark);
  }
};

const onEdit = async (bookmarkElement, bookmark) => {
  const newDesc = prompt("Edit bookmark description:", bookmark.desc);

  if (newDesc === null || newDesc.trim() === bookmark.desc) {
    return; // User cancelled or no change
  }

  const finalDesc = newDesc.trim() || bookmark.desc;

  try {
    const currentTab = await getCurrentTab();

    if (!currentTab || !currentTab.id) {
      console.error("No active tab found");
      return;
    }

    chrome.tabs.sendMessage(
      currentTab.id,
      {
        type: "EDIT",
        value: bookmark.time,
        bookmarkId: bookmark.id,
        newDesc: finalDesc,
      },
      (updatedBookmarks) => {
        if (chrome.runtime.lastError) {
          console.error("Error editing bookmark:", chrome.runtime.lastError);
          alert("Error editing bookmark!");
        } else if (updatedBookmarks) {
          viewBookmarks(updatedBookmarks);
        }
      }
    );
  } catch (error) {
    console.error("Error editing bookmark:", error);
  }
};

const setBookmarkAttributes = (src, eventListener, controlParentElement) => {
  // Use text button for edit if no icon exists
  if (src === "edit") {
    const controlElement = document.createElement("button");
    controlElement.textContent = "✏️";
    controlElement.className = "edit-btn";
    controlElement.title = "Edit description";
    controlElement.addEventListener("click", eventListener);
    controlParentElement.appendChild(controlElement);
    return;
  }

  const controlElement = document.createElement("img");
  controlElement.src = "assets/" + src + ".png";
  
  // Better titles
  const titles = {
    "play-button": "Play from this timestamp",
    "delete": "Delete bookmark"
  };
  controlElement.title = titles[src] || src;
  
  controlElement.addEventListener("click", eventListener);
  controlParentElement.appendChild(controlElement);
};

// Export bookmarks
const exportBookmarks = () => {
  if (allBookmarks.length === 0) {
    alert("No bookmarks to export!");
    return;
  }

  const data = {
    videoId: currentVideoId,
    bookmarks: allBookmarks,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookmarks-${currentVideoId}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Import bookmarks
const importBookmarks = async () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
        alert("Invalid bookmark file format!");
        return;
      }

      const currentTab = await getCurrentTab();
      const url = new URL(currentTab.url);
      const videoId = url.searchParams.get("v");

      if (!videoId) {
        alert("Please open a YouTube video first!");
        return;
      }

      // Merge with existing bookmarks
      chrome.storage.sync.get([videoId], (obj) => {
        let existingBookmarks = [];
        try {
          existingBookmarks = obj[videoId] ? JSON.parse(obj[videoId]) : [];
        } catch (error) {
          console.error("Error parsing existing bookmarks:", error);
        }

        const mergedBookmarks = [...existingBookmarks, ...data.bookmarks];
        
        // Remove duplicates based on time
        const uniqueBookmarks = mergedBookmarks.filter(
          (bookmark, index, self) =>
            index === self.findIndex((b) => Math.abs(b.time - bookmark.time) < 1)
        );

        // Sort by time
        uniqueBookmarks.sort((a, b) => a.time - b.time);

        chrome.storage.sync.set(
          { [videoId]: JSON.stringify(uniqueBookmarks) },
          () => {
            if (chrome.runtime.lastError) {
              alert("Error importing bookmarks!");
            } else {
              viewBookmarks(uniqueBookmarks);
              alert(`Imported ${data.bookmarks.length} bookmarks!`);
            }
          }
        );
      });
    } catch (error) {
      console.error("Error importing bookmarks:", error);
      alert("Error reading file!");
    }
  };

  input.click();
};

// Search/filter bookmarks
const filterBookmarks = (searchTerm) => {
  const term = searchTerm.toLowerCase().trim();
  
  if (!term) {
    viewBookmarks(allBookmarks);
    return;
  }

  const filtered = allBookmarks.filter((bookmark) =>
    bookmark.desc.toLowerCase().includes(term)
  );

  viewBookmarks(filtered);
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const currentTab = await getCurrentTab();

    if (!currentTab || !currentTab.url) {
      throw new Error("No active tab found");
    }

    const url = new URL(currentTab.url);
    const currentVideo = url.searchParams.get("v");
    currentVideoId = currentVideo;

    if (
      url.hostname.includes("youtube.com") &&
      url.pathname === "/watch" &&
      currentVideo
    ) {
      // Setup search box
      const searchBox = document.getElementById("searchBox");
      if (searchBox) {
        searchBox.addEventListener("input", (e) => {
          filterBookmarks(e.target.value);
        });
      }

      // Setup export button
      const exportBtn = document.getElementById("exportBtn");
      if (exportBtn) {
        exportBtn.addEventListener("click", exportBookmarks);
      }

      // Setup import button
      const importBtn = document.getElementById("importBtn");
      if (importBtn) {
        importBtn.addEventListener("click", importBookmarks);
      }

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

const getTime = (t) => {
  var date = new Date(0);
  date.setSeconds(t);
  return date.toISOString().substr(11, 8);
};


const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

(() => {

  const waitForChromeAPI = () => {
    return new Promise((resolve) => {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        resolve(true);
      } else {
        // Retry after short delay
        setTimeout(() => {
          if (
            typeof chrome !== "undefined" &&
            chrome.storage &&
            chrome.storage.sync
          ) {
            resolve(true);
          } else {
            console.error("Chrome API not available after waiting");
            resolve(false);
          }
        }, 1000);
      }
    });
  };

  let currentVideo = "";
  let youtubeLeftControls, youtubePlayer;
  let currentVideoBookmarks = [];
  let urlObserver = null;
  let chromeApiReady = false;

 
  waitForChromeAPI().then((ready) => {
    chromeApiReady = ready;
    if (!ready) {
      console.error(
        " Chrome Storage API not available. Extension may not work properly."
      );
      console.error("Try reloading the extension from chrome://extensions/");
    } else {
      console.log(" Chrome Storage API ready");
      // Initialize on page load
      if (currentVideo) {
        newVideoLoaded();
      }
    }
  });

  // Extract video ID from current URL
  const getVideoIdFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("v");
  };

  // Initialize video ID on page load
  currentVideo = getVideoIdFromUrl() || "";

  const getYouTubePlayer = () => {
    return (
      document.getElementsByClassName("video-stream")[0] ||
      document.querySelector("video")
    );
  };

  const fetchBookmarks = () => {
    return new Promise((resolve) => {
      if (!currentVideo) {
        resolve([]);
        return;
      }

     
      if (
        !chromeApiReady ||
        !chrome ||
        !chrome.storage ||
        !chrome.storage.sync
      ) {
        console.error("Chrome storage API not available");
        alert(
          "Extension error: Chrome Storage API not ready.\n\nPlease:\n1. Go to chrome://extensions/\n2. Click the refresh icon on this extension\n3. Reload this YouTube page"
        );
        resolve([]);
        return;
      }

      chrome.storage.sync.get([currentVideo], (obj) => {
        if (chrome.runtime.lastError) {
          console.error("Error fetching bookmarks:", chrome.runtime.lastError);
          resolve([]);
          return;
        }
        try {
          resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
        } catch (error) {
          console.error("Error parsing bookmarks:", error);
          resolve([]);
        }
      });
    });
  };

  const addNewBookmarkEventListner = async () => {
    // Check if Chrome API is ready
    if (!chromeApiReady) {
      alert(
        "Extension not ready yet. Please wait a moment and try again.\n\nIf this persists:\n1. Go to chrome://extensions/\n2. Reload this extension\n3. Refresh this page"
      );
      return;
    }

    // Check if we have a video ID
    if (!currentVideo) {
      currentVideo = getVideoIdFromUrl();
      if (!currentVideo) {
        console.error("No video ID found. Cannot save bookmark.");
        alert("Error: Could not identify video. Please refresh the page.");
        return;
      }
    }

    // Ensure we have the latest player reference
    youtubePlayer = getYouTubePlayer();

    if (!youtubePlayer) {
      console.error("YouTube player not found");
      alert(
        "Error: Video player not found. Please wait for the video to load."
      );
      return;
    }

    const currentTime = youtubePlayer.currentTime || 0;

    if (currentTime === 0 && youtubePlayer.readyState < 2) {
      console.error("Video not ready yet");
      alert("Please wait for the video to load before bookmarking.");
      return;
    }

    try {
      currentVideoBookmarks = await fetchBookmarks();

      // Check for duplicate bookmarks (within 2 seconds)
      const DUPLICATE_THRESHOLD = 2;
      const isDuplicate = currentVideoBookmarks.some(
        (b) => Math.abs(b.time - currentTime) < DUPLICATE_THRESHOLD
      );

      if (isDuplicate) {
        alert(" A bookmark already exists near this timestamp!");
        return;
      }

      // Prompt for custom description
      const defaultDesc = "Bookmark at " + getTime(currentTime);
      const customDesc = prompt("Enter bookmark description:", defaultDesc);

      // User cancelled
      if (customDesc === null) {
        return;
      }

      // Use default if empty
      const finalDesc = customDesc.trim() || defaultDesc;

      const newBookmark = {
        id: generateId(),
        time: currentTime,
        desc: finalDesc,
        createdAt: new Date().toISOString(),
      };

      const updatedBookmarks = [...currentVideoBookmarks, newBookmark].sort(
        (a, b) => a.time - b.time
      );

      // Verify chrome.storage is available before saving
      if (!chrome || !chrome.storage || !chrome.storage.sync) {
        console.error("Chrome storage API not available");
        alert(
          "Extension error: Cannot save bookmark. Please reload the extension from chrome://extensions and try again."
        );
        return;
      }

      chrome.storage.sync.set(
        {
          [currentVideo]: JSON.stringify(updatedBookmarks),
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving bookmark:", chrome.runtime.lastError);
            alert("Error saving bookmark: " + chrome.runtime.lastError.message);
          } else {
            console.log("Bookmark saved successfully!");
            // Visual feedback with checkmark
            const btn = document.querySelector(".bookmark-btn");
            if (btn) {
              const originalTitle = btn.title;
              btn.title = "✓ Bookmark saved!";
              btn.style.opacity = "0.5";
              setTimeout(() => {
                btn.style.opacity = "1";
                btn.title = originalTitle;
              }, 1000);
            }
          }
        }
      );
    } catch (error) {
      console.error("Error in addNewBookmarkEventListner:", error);
      alert("Error saving bookmark: " + error.message);
    }
  };

  const newVideoLoaded = async () => {
    // Update video ID if not set
    if (!currentVideo) {
      currentVideo = getVideoIdFromUrl() || "";
    }

    if (!currentVideo) {
      console.log("Not a YouTube watch page, skipping bookmark button");
      return;
    }

    // Wait for YouTube controls to be ready
    const waitForControls = (maxAttempts = 20) => {
      return new Promise((resolve) => {
        let attempts = 0;
        const checkControls = () => {
          youtubeLeftControls =
            document.getElementsByClassName("ytp-left-controls")[0];
          if (youtubeLeftControls || attempts >= maxAttempts) {
            resolve(youtubeLeftControls);
          } else {
            attempts++;
            setTimeout(checkControls, 300);
          }
        };
        checkControls();
      });
    };

    await waitForControls();

    const bookmarkBtnExists =
      document.getElementsByClassName("bookmark-btn")[0];

    currentVideoBookmarks = await fetchBookmarks();

    if (!bookmarkBtnExists && youtubeLeftControls) {
      youtubePlayer = getYouTubePlayer();

      try {
        const bookmarkBtn = document.createElement("img");
        bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
        bookmarkBtn.className = "ytp-button bookmark-btn";
        bookmarkBtn.title = "Bookmark this timestamp (Ctrl+Shift+B)";
        bookmarkBtn.style.cursor = "pointer";
        bookmarkBtn.style.width = "40px";

        youtubeLeftControls.appendChild(bookmarkBtn);
        bookmarkBtn.addEventListener("click", addNewBookmarkEventListner);

        console.log(" Bookmark button added for video:", currentVideo);
      } catch (error) {
        console.error("Error adding bookmark button:", error);
      }
    } else if (bookmarkBtnExists) {
      // Update player reference even if button exists
      youtubePlayer = getYouTubePlayer();
      console.log("Bookmark button already exists for video:", currentVideo);
    } else {
      console.log("YouTube controls not found yet for video:", currentVideo);
    }
  };

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId, bookmarkId, newDesc } = obj;
    console.log("Message:", obj);
    console.log("Sent from tab:", sender.tab);

    if (type === "NEW") {
      const newVideoId = videoId || getVideoIdFromUrl();
      if (newVideoId && newVideoId !== currentVideo) {
        currentVideo = newVideoId;
        console.log("New video detected:", currentVideo);
        newVideoLoaded();
      }
    } else if (type === "PLAY") {
      // Ensure we have the latest player reference
      youtubePlayer = getYouTubePlayer();
      if (youtubePlayer) {
        try {
          youtubePlayer.currentTime = value;
          // Force play if paused
          if (youtubePlayer.paused) {
            youtubePlayer.play().catch((err) => {
              console.error("Error playing video:", err);
            });
          }
        } catch (error) {
          console.error("Error seeking video:", error);
        }
      } else {
        console.error("YouTube player not found for playback");
      }
    } else if (type === "DELETE") {
      (async () => {
        if (!chrome || !chrome.storage || !chrome.storage.sync) {
          console.error("Chrome storage API not available");
          response(null);
          return;
        }

        currentVideoBookmarks = await fetchBookmarks();
        currentVideoBookmarks = currentVideoBookmarks.filter(
          (bookmark) => bookmark.id !== bookmarkId && bookmark.time !== value
        );
        chrome.storage.sync.set(
          {
            [currentVideo]: JSON.stringify(currentVideoBookmarks),
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error deleting bookmark:",
                chrome.runtime.lastError
              );
            }
            response(currentVideoBookmarks);
          }
        );
      })();
      return true; // Indicates async response
    } else if (type === "EDIT") {
      (async () => {
        if (!chrome || !chrome.storage || !chrome.storage.sync) {
          console.error("Chrome storage API not available");
          response(null);
          return;
        }

        currentVideoBookmarks = await fetchBookmarks();
        const bookmarkIndex = currentVideoBookmarks.findIndex(
          (b) => b.id === bookmarkId || b.time === value
        );

        if (bookmarkIndex !== -1) {
          currentVideoBookmarks[bookmarkIndex].desc = newDesc;
          chrome.storage.sync.set(
            {
              [currentVideo]: JSON.stringify(currentVideoBookmarks),
            },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error editing bookmark:",
                  chrome.runtime.lastError
                );
              }
              response(currentVideoBookmarks);
            }
          );
        } else {
          response(null);
        }
      })();
      return true; // Indicates async response
    }
  });

  // Listen for YouTube's SPA navigation (popstate event)
  window.addEventListener("popstate", () => {
    const newVideoId = getVideoIdFromUrl();
    if (newVideoId && newVideoId !== currentVideo) {
      currentVideo = newVideoId;
      console.log("Video changed via navigation:", currentVideo);
      newVideoLoaded();
    }
  });

  // PERFORMANCE OPTIMIZATION: Use MutationObserver instead of polling
  // Observe changes to the document title (YouTube updates title on navigation)
  let lastUrl = location.href;

  const observeUrlChanges = () => {
    if (urlObserver) {
      urlObserver.disconnect();
    }

    urlObserver = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        const newVideoId = getVideoIdFromUrl();
        if (newVideoId && newVideoId !== currentVideo) {
          currentVideo = newVideoId;
          console.log(
            "Video changed (detected via MutationObserver):",
            currentVideo
          );
          newVideoLoaded();
        }
      }
    });

    const titleElement = document.querySelector("title");
    if (titleElement) {
      urlObserver.observe(titleElement, {
        childList: true,
        subtree: true,
      });
    }

    // Fallback: Also observe the main content area
    const mainContent = document.querySelector("ytd-app");
    if (mainContent) {
      urlObserver.observe(mainContent, {
        childList: true,
        subtree: false,
      });
    }
  };

  observeUrlChanges();

  // Fallback polling (reduced frequency) for edge cases
  setInterval(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      const newVideoId = getVideoIdFromUrl();
      if (newVideoId && newVideoId !== currentVideo) {
        currentVideo = newVideoId;
        console.log("Video changed (fallback polling):", currentVideo);
        newVideoLoaded();
      }
    }
  }, 3000); // Reduced from 1000ms to 3000ms

  // Keyboard shortcut: Ctrl+Shift+B to bookmark
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "B") {
      e.preventDefault();
      if (currentVideo) {
        addNewBookmarkEventListner();
      }
    }
  });
})();

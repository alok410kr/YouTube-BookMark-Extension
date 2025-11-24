const getTime = (t) => {
  var date = new Date(0);
  date.setSeconds(t);
  return date.toISOString().substr(11, 8);
};

(() => {
  let currentVideo = "";
  let youtubeLeftControls, youtubePlayer;
  let currentVideoBookmarks = [];

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

    const newBookmark = {
      time: currentTime,
      desc: "Bookmark at " + getTime(currentTime),
    };

    try {
      currentVideoBookmarks = await fetchBookmarks();

      const updatedBookmarks = [...currentVideoBookmarks, newBookmark].sort(
        (a, b) => a.time - b.time
      );

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
            // Visual feedback
            const btn = document.querySelector(".bookmark-btn");
            if (btn) {
              btn.style.opacity = "0.5";
              setTimeout(() => {
                btn.style.opacity = "1";
              }, 200);
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

      const bookmarkBtn = document.createElement("img");
      bookmarkBtn.src = chrome.runtime.getURL("assets/bookmark.png");
      bookmarkBtn.className = "ytp-button bookmark-btn";
      bookmarkBtn.title = "Bookmark this timestamp";
      bookmarkBtn.style.cursor = "pointer";

      youtubeLeftControls.appendChild(bookmarkBtn);
      bookmarkBtn.addEventListener("click", addNewBookmarkEventListner);

      console.log("Bookmark button added for video:", currentVideo);
    } else {
      // Update player reference even if button exists
      youtubePlayer = getYouTubePlayer();
    }
  };

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;

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
        currentVideoBookmarks = await fetchBookmarks();
        currentVideoBookmarks = currentVideoBookmarks.filter(
          (bookmark) => bookmark.time !== value
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
    }
  });

  // Initialize on page load
  if (currentVideo) {
    newVideoLoaded();
  }

  // Listen for YouTube's SPA navigation (popstate event)
  window.addEventListener("popstate", () => {
    const newVideoId = getVideoIdFromUrl();
    if (newVideoId && newVideoId !== currentVideo) {
      currentVideo = newVideoId;
      console.log("Video changed via navigation:", currentVideo);
      newVideoLoaded();
    }
  });

  // Also check URL periodically for SPA navigation (YouTube doesn't always fire popstate)
  let lastUrl = location.href;
  setInterval(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      const newVideoId = getVideoIdFromUrl();
      if (newVideoId && newVideoId !== currentVideo) {
        currentVideo = newVideoId;
        console.log("Video changed (detected via polling):", currentVideo);
        newVideoLoaded();
      }
    }
  }, 1000);
})();

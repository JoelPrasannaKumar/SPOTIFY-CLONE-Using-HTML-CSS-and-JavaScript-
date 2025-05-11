let currentSong = new Audio();
let songs;
let currfolder;

// Initialize volume
currentSong.volume = 0.5;

// DOM Elements
const playPauseButton = document.querySelector('.play-pause');
const progressBar = document.querySelector('.progress-bar');
const progress = document.querySelector('.progress');
const songCards = document.querySelectorAll('.song-card');
const artistCards = document.querySelectorAll('.artist-card');

// Audio Player
let isPlaying = false;

// Mobile menu functionality
const mobileMenuButton = document.querySelector('.mobile-menu-button');
const navActions = document.querySelector('.nav-actions');
const dropdownClose = document.querySelector('.dropdown-close');

mobileMenuButton.addEventListener('click', () => {
    navActions.classList.toggle('mobile-menu');
    document.querySelector('.mobile-menu img').style.display = 'none';
});

dropdownClose.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event bubbling
    navActions.classList.remove('mobile-menu');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (event) => {
    if (!navActions.contains(event.target) && !mobileMenuButton.contains(event.target)) {
        navActions.classList.remove('mobile-menu');
    }
});

async function getSongs(folder) {
    currfolder = folder;
    let response = await fetch(`/${folder}/`);
    let data = await response.text();
    let div = document.createElement("div");
    div.innerHTML = data;
    let as = div.getElementsByTagName("a");
    
    songs = [];
    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            let song = element.href.split(`/${folder}/`)[1];
            songs.push(song);
        }
    }
    return songs;
}

const playMusic = (track, pause = false) => {
    currentSong.src = `/${currfolder}/` + track;
    if (!pause) {
        currentSong.play();
        updatePlayButtonStates(true);
    }
    document.querySelector(".songinfo").innerHTML = decodeURI(track);
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}

async function displayAlbums() {
    let response = await fetch(`/songs/`);
    let data = await response.text();
    let div = document.createElement("div");
    div.innerHTML = data;
    let anchors = div.getElementsByTagName("a");
    let songGrid = document.querySelector(".song-grid");
    
    // Keep existing content but add data-folder to first two cards
    const existingCards = songGrid.querySelectorAll('.song-card');
    existingCards.forEach((card, index) => {
        if (index < 2) {
            card.setAttribute('data-folder', `songs${index + 1}`);
        }
    });

    // Add click event listeners to song cards
    document.querySelectorAll(".song-card").forEach(card => {
        card.addEventListener("click", async () => {
            const folder = card.dataset.folder;
            if (folder) { // Only handle clicks on cards with folder data
                const songs = await getSongs(folder);
                
                // Clear existing playlist
                const playlistsContainer = document.querySelector('.playlists');
                playlistsContainer.innerHTML = '';
                
                // Add songs to playlist
                songs.forEach(song => {
                    // Decode the URL-encoded song name
                    const decodedSong = decodeURIComponent(song);
                    
                    // Split the song name into artist and title
                    let songName, artistName;
                    
                    if (decodedSong.includes(' - ')) {
                        [artistName, songName] = decodedSong.split(' - ');
                        // Remove [NCS Release] or similar tags from song name
                        songName = songName.split('[')[0].trim();
                    } else {
                        songName = decodedSong.split('[')[0].trim();
                        artistName = 'Unknown Artist';
                    }
                    
                    playlistsContainer.innerHTML += `
                        <div class="playlist-item">
                            <div class="playlist-icon">
                                <img src="svgs/music.svg" alt="Music">
                            </div>
                            <div class="playlist-info">
                                <div class="playlist-name">${songName}</div>
                                <div class="playlist-meta">${artistName}</div>
                            </div>
                            <button class="play-now" data-song="${song}">
                                <img src="/svgs/play.svg" alt="">
                            </button>
                        </div>`;
                });

                // Add event listeners to new playlist items
                document.querySelectorAll('.play-now').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const songFile = button.getAttribute('data-song');
                        currentSong.src = `/${folder}/${songFile}`;
                        currentSong.play();
                        isPlaying = true;
                        updatePlayButtonStates(true);
                        updateNowPlaying(button);
                    });
                });
            }
        });
    });
}

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds)) return "00:00";
    return new Date(seconds * 1000).toISOString().substr(14, 5);
}

// Function to update all play button states
function updatePlayButtonStates(isPlaying) {
    // Update main playbar button
    playPauseButton.querySelector('img').src = isPlaying ? 'svgs/pause.svg' : 'svgs/play2.svg';
    
    // Find and update the current song's playlist button
    if (currentSong.src) {
        const currentSongFile = currentSong.src.split('/songs/').pop();
        const currentPlaylistButton = document.querySelector(`.play-now[data-song="${currentSongFile}"]`);
        if (currentPlaylistButton) {
            currentPlaylistButton.querySelector('img').src = isPlaying ? '/svgs/pause.svg' : '/svgs/play.svg';
        }
    }
}

// Play/Pause Functionality for main playbar
function togglePlayPause() {
    if (isPlaying) {
        currentSong.pause();
    } else {
        currentSong.play().catch(error => {
            console.error('Error playing audio:', error);
            isPlaying = false;
            updatePlayButtonStates(false);
        });
    }
}

// Update Progress Bar
function updateProgress() {
    if (!currentSong.duration) return;
    
    const progressPercent = (currentSong.currentTime / currentSong.duration) * 100;
    progress.style.width = `${progressPercent}%`;
    
    // Update time display
    const currentTime = secondsToMinutesSeconds(currentSong.currentTime);
    const duration = secondsToMinutesSeconds(currentSong.duration);
    document.querySelector(".songtime").innerHTML = `${currentTime} / ${duration}`;
}

// Set Progress
function setProgress(e) {
    const progressBar = this;
    const width = progressBar.clientWidth;
    const clickX = e.offsetX;
    const duration = currentSong.duration;
    
    if (!duration) return;
    
    currentSong.currentTime = (clickX / width) * duration;
    updateProgress();
}

// Add progress bar interaction
let isDragging = false;

progressBar.addEventListener('mousedown', (e) => {
    isDragging = true;
    progressBar.classList.add('seeking');
    setProgress.call(progressBar, e);
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const progressBarRect = progressBar.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - progressBarRect.left, progressBarRect.width));
    const duration = currentSong.duration;
    
    if (!duration) return;
    
    const percentage = (clickX / progressBarRect.width) * 100;
    progress.style.width = `${percentage}%`;
    currentSong.currentTime = (clickX / progressBarRect.width) * duration;
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        progressBar.classList.remove('seeking');
    }
});

// Prevent text selection while dragging
progressBar.addEventListener('selectstart', (e) => e.preventDefault());

// Update time display function
function updateTimeDisplay() {
    if (!currentSong.duration) return;
    
    const currentTime = secondsToMinutesSeconds(currentSong.currentTime);
    const duration = secondsToMinutesSeconds(currentSong.duration);
    document.querySelector(".songtime").innerHTML = `${currentTime} / ${duration}`;
}

// Function to get current song index in playlist
function getCurrentSongIndex() {
    const currentSongFile = currentSong.src.split('/songs/').pop();
    const playlistItems = document.querySelectorAll('.playlist-item');
    for (let i = 0; i < playlistItems.length; i++) {
        const button = playlistItems[i].querySelector('.play-now');
        if (button.getAttribute('data-song') === currentSongFile) {
            return i;
        }
    }
    return -1;
}

// Function to play next song
function playNextSong() {
    const playlistItems = document.querySelectorAll('.playlist-item');
    const currentSongPath = decodeURIComponent(currentSong.src);
    console.log('Current song path:', currentSongPath);
    
    let currentIndex = -1;

    // Find the current song's index
    for (let i = 0; i < playlistItems.length; i++) {
        const button = playlistItems[i].querySelector('.play-now');
        const songFile = button.getAttribute('data-song');
        console.log('Comparing with:', songFile);
        
        // Try different path comparisons
        if (currentSongPath.includes(songFile)) {
            currentIndex = i;
            console.log('Found match at index:', i);
            break;
        }
    }

    console.log('Current index:', currentIndex);

    // If no current song is found, start from the first song
    if (currentIndex === -1) {
        currentIndex = 0;
        console.log('No match found, starting from first song');
    }

    // Calculate next index
    let nextIndex = (currentIndex + 1) % playlistItems.length;
    console.log('Next index:', nextIndex);
    
    const nextButton = playlistItems[nextIndex].querySelector('.play-now');
    const nextSongFile = nextButton.getAttribute('data-song');
    console.log('Next song file:', nextSongFile);

    // Reset all play buttons
    document.querySelectorAll('.play-now img').forEach(img => {
        img.src = '/svgs/play.svg';
    });

    // Play the next song
    currentSong.src = `/songs/${nextSongFile}`;
    console.log('Playing:', currentSong.src);
    currentSong.play();
    isPlaying = true;
    updatePlayButtonStates(true);
    updateNowPlaying(nextButton);
}

// Function to play previous song
function playPreviousSong() {
    const playlistItems = document.querySelectorAll('.playlist-item');
    const currentSongPath = decodeURIComponent(currentSong.src);
    console.log('Current song path:', currentSongPath);
    
    let currentIndex = -1;

    // Find the current song's index
    for (let i = 0; i < playlistItems.length; i++) {
        const button = playlistItems[i].querySelector('.play-now');
        const songFile = button.getAttribute('data-song');
        console.log('Comparing with:', songFile);
        
        // Try different path comparisons
        if (currentSongPath.includes(songFile)) {
            currentIndex = i;
            console.log('Found match at index:', i);
            break;
        }
    }

    console.log('Current index:', currentIndex);

    // If no current song is found, start from the last song
    if (currentIndex === -1) {
        currentIndex = playlistItems.length - 1;
        console.log('No match found, starting from last song');
    }

    // Calculate previous index
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
        prevIndex = playlistItems.length - 1;
    }
    console.log('Previous index:', prevIndex);
    
    const prevButton = playlistItems[prevIndex].querySelector('.play-now');
    const prevSongFile = prevButton.getAttribute('data-song');
    console.log('Previous song file:', prevSongFile);

    // Reset all play buttons
    document.querySelectorAll('.play-now img').forEach(img => {
        img.src = '/svgs/play.svg';
    });

    // Play the previous song
    currentSong.src = `/songs/${prevSongFile}`;
    console.log('Playing:', currentSong.src);
    currentSong.play();
    isPlaying = true;
    updatePlayButtonStates(true);
    updateNowPlaying(prevButton);
}

// Playlist functionality
document.querySelectorAll('.play-now').forEach(button => {
    button.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent event bubbling
        const songFile = button.getAttribute('data-song');

        try {
            // If this is the first time playing any song
            if (!currentSong.src) {
                currentSong.src = `/songs/${songFile}`;
                await currentSong.play();
                isPlaying = true;
                updatePlayButtonStates(true);
                updateNowPlaying(button);
                return;
            }

            // If clicking the currently playing song
            if (currentSong.src.endsWith(songFile)) {
                if (isPlaying) {
                    currentSong.pause();
                    isPlaying = false;
                    updatePlayButtonStates(false);
                } else {
                    await currentSong.play();
                    isPlaying = true;
                    updatePlayButtonStates(true);
                }
            } else {
                // Reset all play buttons to play state
                document.querySelectorAll('.play-now img').forEach(img => {
                    img.src = '/svgs/play.svg';
                });
                
                // Set new song and update UI
                currentSong.src = `/songs/${songFile}`;
                await currentSong.play();
                isPlaying = true;
                updatePlayButtonStates(true);
                updateNowPlaying(button);
            }
        } catch (error) {
            console.error('Error handling audio:', error);
            isPlaying = false;
            updatePlayButtonStates(false);
        }
    });
});

// Helper function to update now playing information
function updateNowPlaying(button) {
    const playlistItem = button.closest('.playlist-item');
    const songName = playlistItem.querySelector('.playlist-name').textContent;
    const artistName = playlistItem.querySelector('.playlist-meta').textContent;
    
    document.querySelector('.now-playing h4').textContent = songName;
    document.querySelector('.now-playing p').textContent = artistName;
}

// Update the pause event listener
currentSong.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayButtonStates(false);
});

// Update the play event listener
currentSong.addEventListener('play', () => {
    isPlaying = true;
    updatePlayButtonStates(true);
});

// Add event listener for song ended
currentSong.addEventListener('ended', () => {
    isPlaying = false;
    updatePlayButtonStates(false);
});

// Event Listeners
document.addEventListener("DOMContentLoaded", async () => {
    await getSongs("songs");
    await displayAlbums();

    // Set initial play button states
    playPauseButton.querySelector('img').src = 'svgs/play2.svg';
    document.querySelectorAll('.play-now img').forEach(img => {
        img.src = '/svgs/play.svg';
    });

    // Play/Pause button in playbar
    playPauseButton.addEventListener("click", () => {
        togglePlayPause();
    });

    // Previous button - play immediately
    previous.addEventListener("click", () => {
        playPreviousSong();
    });

    // Next button - play immediately
    next.addEventListener("click", () => {
        playNextSong();
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowRight') {
            playNextSong();
        } else if (e.code === 'ArrowLeft') {
            playPreviousSong();
        } else if (e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        }
    });

    // Update time and seekbar
    currentSong.addEventListener("timeupdate", () => {
        updateProgress();
        updateTimeDisplay();
    });

    // Seekbar click
    progressBar.addEventListener("click", setProgress);

    // Volume control
    let volumeSlider = document.querySelector(".volume-slider");
    volumeSlider.addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".volume-progress").style.width = percent + "%";
        currentSong.volume = percent / 100;
    });

    // Volume button
    document.querySelector(".volume-button").addEventListener("click", () => {
        if (currentSong.volume > 0) {
            currentSong.volume = 0;
            document.querySelector(".volume-progress").style.width = "0%";
            document.querySelector(".volume-button img").src = "svgs/mute.svg";
        } else {
            currentSong.volume = 0.5;
            document.querySelector(".volume-progress").style.width = "50%";
            document.querySelector(".volume-button img").src = "svgs/volume.svg";
        }
    });

    // Set initial state
    isPlaying = false;
});

// Song Card Hover Effects
songCards.forEach(card => {
    const playButton = card.querySelector('.play-button');
    
    card.addEventListener('mouseenter', () => {
        playButton.style.opacity = '1';
        playButton.style.transform = 'translateY(-8px)';
    });
    
    card.addEventListener('mouseleave', () => {
        playButton.style.opacity = '0';
        playButton.style.transform = 'translateY(0)';
    });
    
    card.addEventListener('click', () => {
        // Update now playing info
        const songTitle = card.querySelector('h3').textContent;
        const artistName = card.querySelector('p').textContent;
        const songImage = card.querySelector('img').src;
        
        document.querySelector('.now-playing h4').textContent = songTitle;
        document.querySelector('.now-playing p').textContent = artistName;
        document.querySelector('.now-playing img').src = songImage;
        
        // Play the song
        if (!isPlaying) {
            togglePlayPause();
        }
    });
});

// Artist Card Hover Effects
artistCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.backgroundColor = 'var(--surface-low)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.backgroundColor = 'var(--surface)';
    });
});


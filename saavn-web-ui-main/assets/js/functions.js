var playlists = {
    "Liked Songs": [],
    "Downloaded": []  // built-in playlist
};
var currentPlaylist = null;
var likedSongIds = new Set();
var pendingAddSongId = null;
let isPlaylistMode = false;
let currentPlaylistIndex = 0;
let currentPlaylistArray = [];



function AddToPlaylist(song_id) {
    if (!results_objects[song_id]) return;
    if (Object.keys(playlists).length === 0) {
        // Pre-fill UI if no playlists exist
        document.getElementById("playlist-picker-select").innerHTML = `<option disabled>No playlists available</option>`;
    } else {
        const select = document.getElementById("playlist-picker-select");
        select.innerHTML = '';
        for (const name in playlists) {
            select.innerHTML += `<option value="${name}">${name}</option>`;
        }
    }

    pendingAddSongId = song_id;
    document.getElementById("playlist-picker-modal").style.display = "flex";
}
function RemoveFromPlaylist(song_id) {
    if (!currentPlaylist || !playlists[currentPlaylist]) return;
    const list = playlists[currentPlaylist];

    const index = list.findIndex(item => item.track.id === song_id);
    if (index !== -1) {
        list.splice(index, 1);
        UpdatePlaylistDisplay();
    }
}
function MoveUp(song_id) {
    if (!currentPlaylist || !playlists[currentPlaylist]) return;
    const list = playlists[currentPlaylist];

    const index = list.findIndex(item => item.track.id === song_id);
    if (index > 0) {
        const temp = list[index];
        list[index] = list[index - 1];
        list[index - 1] = temp;
        UpdatePlaylistDisplay();
    }
}
function createPlaylist(name) {
    fetch('http://localhost:3000/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    })
    .then(res => res.json())
    .then(data => {
        console.log("Playlist created:", data);
        playlists[name] = [];
        UpdatePlaylistDropdown(); // if you're showing playlists in a dropdown
    })
    .catch(err => console.error('Error creating playlist:', err));
}

function addSongToPlaylistBackend(playlistId, song) {
    fetch('http://localhost:3000/api/playlist/song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playlist_id: playlistId,
            song: {
                id: song.track.id,
                name: song.track.name,
                album: song.track.album.name,
                artist: song.track.primaryArtists,
                image: song.track.image[1]?.link || '',
                downloadUrl: song.track.downloadUrl[4]?.link || song.track.downloadUrl[2]?.link
            }
        })
    }).then(res => {
        if (res.ok) console.log("Song added to DB playlist");
        else console.error("Failed to add song to DB playlist");
    });
}

function loadPlaylistsFromDB() {
    fetch('http://localhost:3000/api/playlists')
        .then(res => res.json())
        .then(data => {
            data.forEach(pl => {
                playlists[pl.name] = [];
                fetch(`http://localhost:3000/api/playlist/${pl.id}/songs`)
                    .then(res => res.json())
                    .then(songs => {
                        playlists[pl.name] = songs.map(song => ({
                            track: {
                                id: song.song_id,
                                name: song.song_name,
                                album: { name: song.album_name },
                                primaryArtists: song.artist_name,
                                image: [{}, { link: song.image_url }],
                                downloadUrl: [{}, {}, {}, {}, { link: song.download_url }]
                            }
                        }));
                        UpdatePlaylistDropdown(); // or wherever you're updating UI
                    });
            });
        });
}

function storeDownload(song, filePath) {
    fetch('http://localhost:3000/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            song_id: song.id,
            song_name: song.name,
            album_name: song.album,
            artist_name: song.artist,
            image_url: song.image,
            file_path: filePath
        })
    }).then(res => {
        if (res.ok) console.log("Download logged");
        else console.error("Failed to log download");
    });
}

function CreatePlaylist() {
    var name = document.getElementById("new-playlist-name").value;
    if (!name) return alert("Please enter a playlist name.");

    // Send to backend
    fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    })
    .then(res => res.json())
    .then(data => {
        // Update both selectors
        let playlistSelector = document.getElementById("playlist-selector");
        let playlistSelect = document.getElementById("playlistSelect");

        let option1 = document.createElement("option");
        option1.value = data.id;
        option1.text = data.name;
        playlistSelector.appendChild(option1);

        let option2 = document.createElement("option");
        option2.value = data.id;
        option2.text = data.name;
        playlistSelect.appendChild(option2);

        // Set new playlist as selected
        playlistSelector.value = data.id;
        SwitchPlaylist(data.id); // Optional: load the songs in that playlist

        document.getElementById("new-playlist-name").value = ""; // Clear input
        alert(`✅ Playlist '${data.name}' created!`);
    })
    .catch(err => {
        console.error("Failed to create playlist:", err);
        alert("❌ Could not create playlist. Try again.");
    });
}



function MoveDown(song_id) {
    if (!currentPlaylist || !playlists[currentPlaylist]) return;
    const list = playlists[currentPlaylist];

    const index = list.findIndex(item => item.track.id === song_id);
    if (index !== -1 && index < list.length - 1) {
        const temp = list[index];
        list[index] = list[index + 1];
        list[index + 1] = temp;
        UpdatePlaylistDisplay();
    }
}

function ToggleLike(song_id) {
    if (!results_objects[song_id]) return;
    const song = results_objects[song_id];
    const likedList = playlists["Liked Songs"];

    const index = likedList.findIndex(item => item.track.id === song_id);

    if (index !== -1) {
        // Already liked → remove
        likedList.splice(index, 1);
        likedSongIds.delete(song_id);
    } else {
        // Not liked → add
        likedList.push(song);
        likedSongIds.add(song_id);
    }

    UpdateLikedButtons(); // visually reflect change

    if (currentPlaylist === "Liked Songs") {
        UpdatePlaylistDisplay();
    }
}
function UpdateLikedButtons() {
    for (const song_id of Object.keys(results_objects)) {
        const btn = document.querySelector(`button[onclick='ToggleLike("${song_id}")']`);
        if (btn) {
            if (likedSongIds.has(song_id)) {
                btn.innerHTML = '💖';
                btn.classList.remove("btn-outline-light");
                btn.classList.add("btn-danger");
            } else {
                btn.innerHTML = '❤️';
                btn.classList.remove("btn-danger");
                btn.classList.add("btn-outline-light");
            }
        }
    }
}


function ConfirmAddToPlaylist() {
    const newName = document.getElementById("playlist-picker-new-name").value.trim();
    const selectedName = document.getElementById("playlist-picker-select").value;
    const song = results_objects[pendingAddSongId];
    let targetPlaylist = null;
    let playlistName = null;

    if (!song) {
        ClosePlaylistPicker();
        return;
    }

    if (newName) {
        if (playlists[newName]) {
            alert("A playlist with this name already exists!");
            return;
        }
        playlists[newName] = [];
        playlistName = newName;
        targetPlaylist = playlists[newName];
        UpdatePlaylistSelector(); // update the dropdown on main UI
    } else {
        playlistName = selectedName;
        targetPlaylist = playlists[selectedName];
    }

    if (!targetPlaylist) {
        alert("Please select or create a playlist.");
        return;
    }

    if (targetPlaylist.some(item => item.track.id === pendingAddSongId)) {
        alert("Already in that playlist!");
        ClosePlaylistPicker();
        return;
    }

    targetPlaylist.push(song);
    if (playlistName === currentPlaylist) {
        UpdatePlaylistDisplay();
    }

    ClosePlaylistPicker();
}


function ClosePlaylistPicker() {
    document.getElementById("playlist-picker-modal").style.display = "none";
    document.getElementById("playlist-picker-new-name").value = '';
    pendingAddSongId = null;
}


function UpdatePlaylistDisplay() {
    const container = document.getElementById("playlist-list");
    container.innerHTML = '';

    if (!currentPlaylist) {
        container.innerHTML = '<p style="color:gray;">No playlist selected</p>';
        return;
    }

    const list = playlists[currentPlaylist];

    if (list.length === 0) {
        container.innerHTML = '<p style="color:gray;">This playlist is empty</p>';
        return;
    }

    list.forEach((song, index) => {
        const track = song.track;
        const song_id = track.id;
        const name = track.name;
        const album = track.album.name;
        const artist = track.primaryArtists || '';
        const year = track.year || '';
        const img = track.image?.[1]?.link || '';
        const play_time = track.duration || '';
        const download_url = track.downloadUrl?.[4]?.link || track.downloadUrl?.[2]?.link || '';

        container.innerHTML += `
            <div class="playlist-song text-left song-container" style="margin-bottom:20px;border-radius:10px;background-color:#1c1c1c;padding:10px;">
                <div class="row" style="margin:auto;">
                    <div class="col-auto" style="padding:0px;padding-right:0px;border-style:none;">
                        <img class="img-fluid d-inline" style="width:100px;height:100px;border-radius:5px;padding-right:10px;" src="${img}" loading="lazy"/>
                    </div>
                    <div class="col" style="border-style:none;padding:2px;">
                        <p class="float-right fit-content" style="margin:0px;color:#fff;padding-right:10px;">${year}</p>
                        <p class="fit-content" style="margin:0px;color:#fff;">${name}</p>
                        <p class="fit-content" style="margin:0px;color:#fff;">${album}</p>
                        <p class="fit-content" style="margin:0px;color:#fff;">${artist}</p>

                        <button class="btn btn-sm btn-success song-btn" onclick='PlayAudio("${download_url}","${song_id}")'>▶</button>
                        <button class="btn btn-sm btn-primary" onclick='PlayAudio("${download_url}", "${song_id}", playlists[currentPlaylist], ${index})'>▶</button>
                        <button class="btn btn-sm btn-outline-light song-btn" onclick='ToggleLike("${song_id}")'>❤️</button>
                        <button class="btn btn-sm btn-warning song-btn" onclick='MoveUp("${song_id}")'>⬆️</button>
                        <button class="btn btn-sm btn-warning song-btn" onclick='MoveDown("${song_id}")'>⬇️</button>
                        <button class="btn btn-sm btn-danger song-btn" onclick='RemoveFromPlaylist("${song_id}")'>❌</button>
                    </div>
                </div>
            </div>
        `;
    });
}

/*function SavePlaylists() {
    localStorage.setItem("playlists", JSON.stringify(playlists));
}*/

function CreatePlaylist() {
    const name = document.getElementById("new-playlist-name").value.trim();
    if (!name) return alert("Please enter a playlist name!");
    if (playlists[name]) return alert("Playlist already exists!");

    playlists[name] = [];
    currentPlaylist = name;
    UpdatePlaylistSelector();
    UpdatePlaylistDisplay();
    document.getElementById("new-playlist-name").value = '';
}
function UpdatePlaylistSelector() {
    const selector = document.getElementById("playlist-selector");
    selector.innerHTML = '';

    // Keep special playlists on top
    if (playlists["Liked Songs"]) {
        selector.innerHTML += `<option value="Liked Songs" ${currentPlaylist === "Liked Songs" ? 'selected' : ''}>❤️ Liked Songs</option>`;
    }
    if (playlists["Downloaded"]) {
        selector.innerHTML += `<option value="Downloaded" ${currentPlaylist === "Downloaded" ? 'selected' : ''}>⬇️ Downloaded</option>`;
    }

    for (const name in playlists) {
        if (name === "Liked Songs" || name === "Downloaded") continue;
        selector.innerHTML += `<option value="${name}" ${name === currentPlaylist ? 'selected' : ''}>${name}</option>`;
    }
}


function SwitchPlaylist(name) {
    currentPlaylist = name;
    UpdatePlaylistDisplay();
}

function loadPlaylistsFromDatabase() {
    fetch('http://localhost:3000/api/playlists')
        .then(res => res.json())
        .then(playlists => {
            playlists.forEach(pl => {
                fetch(`http://localhost:3000/api/playlist/${pl.id}/songs`)
                    .then(res => res.json())
                    .then(songs => {
                        // Reconstruct in your JS structure
                        playlists[pl.name] = songs.map(song => ({
                            track: {
                                id: song.song_id,
                                name: song.song_name,
                                album: { name: song.album_name },
                                artist: song.artist_name,
                                image: [{}, { link: song.image_url }],
                                downloadUrl: [{}, {}, {}, {}, { link: song.download_url }]
                            }
                        }));
                    });
            });
        });
}

function PlayAudio(audio_url, song_id, playlist = null, index = 0) {
    const audio = document.getElementById('player');
    const source = document.getElementById('audioSource');
    source.src = audio_url;

    // Try to get metadata from UI (fallback-safe)
    const name = document.getElementById(song_id + "-n")?.textContent || '';
    const album = document.getElementById(song_id + "-a")?.textContent || '';
    const image = document.getElementById(song_id + "-i")?.getAttribute("src") || '';

    document.title = name + " - " + album;
    document.getElementById("player-name").innerHTML = name;
    document.getElementById("player-album").innerHTML = album;
    document.getElementById("player-image").setAttribute("src", image);

    // Store playlist context
    if (playlist) {
        isPlaylistMode = true;
        currentPlaylistIndex = index;
        currentPlaylistArray = playlist;
    } else {
        isPlaylistMode = false;
        currentPlaylistArray = [];
    }

    // Load and play audio
    const promise = audio.load();
    if (promise) {
        promise.catch(error => console.error(error));
    }
    audio.play();
}

function searchSong(search_term) {
    
document.getElementById('search-box').value=search_term;
var goButton = document.getElementById("search-trigger");
            goButton.click();
    
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const message = input.value;
    if (!message.trim()) return;

    // Add user message to chat history
    const history = document.getElementById('chat-history');
    history.innerHTML += `<p><strong>You:</strong> ${message}</p>`;

    input.value = '...';

    try {
        const res = await fetch('http://localhost:3000/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: message })
        });

        const data = await res.json();
        const botReply = data.reply || 'Sorry, I couldn’t think of anything 😅';

        history.innerHTML += `<p><strong>Bot:</strong> ${botReply}</p>`;
    } catch (err) {
        console.error(err);
        history.innerHTML += `<p><strong>Bot:</strong> Error talking to Gemini API</p>`;
    }

    input.value = '';
}

var DOWNLOAD_API = "https://openmp3compiler.astudy.org"
function AddDownload(id) {
    var bitrate = document.getElementById('saavn-bitrate');
    var bitrate_i = bitrate.options[bitrate.selectedIndex].value;
    // MP3 server API
    var MP3DL = DOWNLOAD_API+"/add?id="+id;
    // make api call, if 200, add to download list
    fetch(MP3DL)
    .then(response => response.json())
    .then(data => {
        if (data.status == "success") {
            // add to download list
            var download_list = document.getElementById("download-list");
            var download_item = document.createElement("li");
           /*
           <li>
                    <div class="col">
                        
                        <img src="https://i.pinimg.com/originals/ed/54/d2/ed54d2fa700d36d4f2671e1be84651df.jpg" width="50px">
                        <div style="display: inline;">
                        <span id="download-name">Song</span>
                        <span id="download-album">Album</span>
                        <br>
                        <span id="download-size">Size</span>
                        <span id="download-status" style="color:green">Compiling.</span>
                        </div>
                    </div>
                    <hr>
                    </li>
           */
            // download_item.innerHTML = '<div class="col"><img src="'+data.image+'" width="50px"><div style="display: inline;"><span id="download-name">'+id+'</span><span id="download-album">'+data.album+'</span><br><span id="download-size">'+data.size+'</span><span id="download-status" style="color:green">Compiling.</span></div></div><hr>';
            download_item.innerHTML = `
            <div class="col">
            <img class="track-img" src="${data.image}" width="50px">
            <div style="display: inline;">
              <span class="track-name"> ${id}</span> - 
              <span class="track-album"> ${data.album}</span>
              <br>
              <span class="track-size"> Size : Null</span>
              <span class="track-status" style="color:green"> </span>
            </div>
          </div>
          <hr>
            `;

            // set download_item track_tag to song id
            download_item.setAttribute("track_tag",id);
            
            // set css class no-bullets
            download_item.className = "no-bullets";

            download_list.appendChild(download_item);
            // every 5 seconds, check download status
            var STATUS_URL = DOWNLOAD_API+"/status?id="+id;
            // get download_status_span by track_tag and class
            var download_status_span = document.querySelector('[track_tag="'+id+'"] .track-status');
            var download_name = document.querySelector('[track_tag="'+id+'"] .track-name');
            var download_album = document.querySelector('[track_tag="'+id+'"] .track-album');
            var download_img = document.querySelector('[track_tag="'+id+'"] .track-img');
            var download_size = document.querySelector('[track_tag="'+id+'"] .track-size');
            // set text content to song name and album name
            
            download_name.innerHTML= results_objects[id].track.name;
            download_status_span.innerHTML = data.status;
            download_album.innerHTML = results_objects[id].track.album.name;
            download_img.setAttribute("src",results_objects[id].track.image[2].link);
            
            // change mpopupLink background and border color to green and back to blue after 1 second
            var float_tap = document.getElementById('mpopupLink');
            float_tap.style.backgroundColor = "green";
            float_tap.style.borderColor = "green";

            setTimeout(function() {
                float_tap.style.backgroundColor = "#007bff";
                float_tap.style.borderColor = "#007bff";
            }, 1000);
            
            // check status every 5 seconds
            var interval = setInterval(function() {
                fetch(STATUS_URL)
                .then(response => response.json())
                .then(data => {
                    if (data.status) {
                        // update status
                        download_status_span.textContent = data.status;
                        if(data.size) {
                            download_size.textContent = "Size: "+data.size;
                        }
                        if (data.status == "Done") {
                            // download complete, add download button
                            download_status_span.innerHTML = `<a href="${DOWNLOAD_API}${data.url}" target="_blank">Download MP3</a>`;
                            // clear interval
                            clearInterval(interval);
                            return;
                  }}
              });}, 3000); // end interval
        } });}

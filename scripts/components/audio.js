var AudioModule = {
    sfxExt: ".mp4",
    cachedMedia: {},

    init: function () {
    },
    play: function (filename) {
        //return; // disable sound for now

        var sfx = null;
        if (window.Media === undefined) {

            var id = filename + this.sfxExt;
            var audioElement = document.getElementById(id);
            if (audioElement == null) {
                audioElement = document.createElement("audio");
                audioElement.setAttribute("id", id);
                audioElement.setAttribute("src", "/sfx/" + filename + this.sfxExt);
                audioElement.setAttribute("type", "audio/mpeg");
                document.body.appendChild(audioElement);
            }
            sfx = audioElement;

            if (sfx.currentTime > 0.0) { // equivalent to stop
                sfx.currentTime = 0.0;
            }
        } else {
            sfx = this.cachedMedia[filename];
            
            if (sfx) {
                sfx.stop();
            } else {
                var url = "/android_asset/www/sfx/" + filename + this.sfxExt;
                var media = new Media(url);
                this.cachedMedia[filename] = media;
                sfx = media;
            }
        }

        sfx.play();

        if (sfx.error != null) {
            this.sfxExt = ".ogg"; // switch file format
            this.playAudio(filename);
        }
    }
};

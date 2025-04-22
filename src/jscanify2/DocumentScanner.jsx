import jscanify from 'jscanify'
import { loadImage } from 'canvas'

export function DocumentScanner2() {


    const scanner = new jscanify();

    const scanDocument = () => {
        
        scanner.loadOpenCV(function(cv){
            const canvas = document.getElementById('canvas');
        const result = document.getElementById('result');
        const video = document.getElementById('video');
        const canvasCtx = canvas.getContext('2d');
        const resultCtx = result.getContext('2d');

        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
              video.play();
          
              setInterval(() => {
                canvasCtx.drawImage(video, 0, 0);
                const resultCanvas = scanner.highlightPaper(canvas);
                resultCtx.drawImage(resultCanvas, 0, 0);
              }, 10);
            };
          });
        })
        
    }


    return (
        <div>
            <h1 onClick={scanDocument}>Document Scanner</h1>
            <video id="video"></video>
            <canvas id="canvas"></canvas>
            <canvas id="result"></canvas>
        </div>
    );
};

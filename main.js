const WCAG_MIN_RATIO = 4.5;

let color1 = document.getElementById('color-1');
let color2 = document.getElementById('color-2');
let color1Adjust = document.getElementById('color-1-adjust');
let color2Adjust = document.getElementById('color-2-adjust');
let ratioField = document.getElementById('ratio');

function contrastRatio(light1, light2) {
  if (light2 > light1)
    [light1, light2] = [light2, light1];

  return (light1 + 0.05) / (light2 + 0.05);  
}

function hsvContrastRatio(hsv1, hsv2) {
  let rgb1 = HSV_RGB.apply(null, hsv1);
  let rgb2 = HSV_RGB.apply(null, hsv2);

  return rgbContrastRatio(rgb1, rgb2);
}

function rgbContrastRatio(rgb1, rgb2) {
  let [r1, g1, b1] = rgb1;
  let [r2, g2, b2] = rgb2;

  return contrastRatio(lightness(r1, g1, b1), lightness(r2, g2, b2));
}

// This is taken from a closure in jscolor.js.
//
// h: 0-360
// s: 0-100
// v: 0-100
//
// returns: [ 0-255, 0-255, 0-255 ]
//
function HSV_RGB (h, s, v) {
  var u = 255 * (v / 100);

  if (h === null) {
    return [ u, u, u ];
  }

  h /= 60;
  s /= 100;

  var i = Math.floor(h);
  var f = i%2 ? h-i : 1-(h-i);
  var m = u * (1 - s);
  var n = u * (1 - s * f);
  switch (i) {
    case 6:
    case 0: return [u,n,m];
    case 1: return [n,u,m];
    case 2: return [m,u,n];
    case 3: return [m,n,u];
    case 4: return [n,m,u];
    case 5: return [u,m,n];
  }
}

function hsvToCss(h, s, v) {
  let [r, g, b] = HSV_RGB(h, s, v);
  return 'rgb(' + Math.floor(r) + ', ' + Math.floor(g) + ', ' +
         Math.floor(b) + ')';
}

function *betterColors(hsv1, hsv2) {
  while (true) {
    let rgb1 = HSV_RGB.apply(null, hsv1);
    let rgb2 = HSV_RGB.apply(null, hsv2);
    let light1 = lightness.apply(null, rgb1);
    let light2 = lightness.apply(null, rgb2);
    let [h, s, v] = hsv1;

    if (light1 > light2) {
      // Lighten our color.
      if (v < 100) {
        v++;
      } else if (s > 0) {
        s--;
      } else {
        return;
      }
    } else {
      // Darken our color.
      if (v > 0) {
        v--;
      } else if (s < 100) {
        s++;
      } else {
        return;
      }
    }

    hsv1 = [h, s, v];
    yield hsv1;
  }
}

function getBestWcagColor(hsv1, hsv2) {
  for ([h, s, v] of betterColors(hsv1, hsv2)) {
    let ratio = hsvContrastRatio([h, s, v], hsv2);
    if (ratio >= WCAG_MIN_RATIO) {
      return [h, s, v];
    }
  }
  return null;
}

// https://github.com/mkdynamic/wcag_color_contrast
// http://stackoverflow.com/a/9733420
function lightness(r, g, b) {
  let val = n => {
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * val(r / 255) +
         0.7152 * val(g / 255) +
         0.0722 * val(b / 255);
}


onload = () => {
  function updateContrastRatio() {
    let ratio = rgbContrastRatio(color1.jscolor.rgb, color2.jscolor.rgb);

    ratioField.value = ratio.toFixed(1);

    if (ratio >= WCAG_MIN_RATIO) {
      color1Adjust.disabled = color2Adjust.disabled = true;
    } else {
      let best1 = getBestWcagColor(color1.jscolor.hsv, color2.jscolor.hsv);

      color1Adjust.disabled = !best1;

      if (best1) {
        color1Adjust.style.color = hsvToCss.apply(null, best1);
        color1Adjust.style.background = color2.jscolor.toHEXString();
      }

      let best2 = getBestWcagColor(color2.jscolor.hsv, color1.jscolor.hsv);

      color2Adjust.disabled = !best2;

      if (best2) {
        color2Adjust.style.color = color1.jscolor.toHEXString();
        color2Adjust.style.background = hsvToCss.apply(null, best2);
      }
    }

    document.body.style.color = '#' + color1.value;
    document.body.style.background = '#' + color2.value;
  }

  function adjust(c1, c2) {
    let bestColor = getBestWcagColor(c1.jscolor.hsv, c2.jscolor.hsv);

    if (bestColor) {
      let [h, s, v] = bestColor;
      c1.jscolor.fromHSV(h, s, v);
      updateContrastRatio();
    }
  }

  updateContrastRatio();
  color1.jscolor.onFineChange = updateContrastRatio;
  color2.jscolor.onFineChange = updateContrastRatio;
  color1Adjust.onclick = () => { adjust(color1, color2); };
  color2Adjust.onclick = () => { adjust(color2, color1); };
};

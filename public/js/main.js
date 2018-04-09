 var sheet = document.styleSheets[0]; //The stylesheet edited to pan and zoom

 var edited = null; //The textbox currently edited
 var dragged = null; //The texbox currently dragged
 var dragOffset = {
     x: 0,
     y: 0
 }; //Offset from mouse when dragging
 var selected = null;


 var startX = 0; //Start x value for panning
 var startY = 0; //Start y value for panning
 var panning = false; //Are we panning or not
 var offsetX = 0; //Panning offset x
 var offsetY = 0; //Panning offset y
 var ruleInserted = -1; //Have we inserted a new css rule dynamically or not and what index does it have?
 var zoom = 1.0; //

 var color = ".color.black";
 var resizing = null; //Box resized by mouse

 ///// Color select /////
 document.addEventListener("touchend", function (e) {
     if (!e.target.classList.contains("color")) return;
     if (e.target.tagName == "INPUT") return;
     color = "";
     for (var i = 0; i < e.target.classList.length; i++) {
         color = "." + e.target.classList[i];
     }
     e.preventDefault();
 });

 ///// PANNING /////
 document.addEventListener("mousedown", function (e) {
     var target = e.target.closest(".box"); //Are we dealing with a box?
     if (target !== null) return;
     startX = e.clientX - offsetX;
     startY = e.clientY - offsetY;
     panning = true;
 });

 document.addEventListener("mousemove", function (e) {
     if (!panning) return; //Are we panning?
     offsetX = e.clientX - startX;
     offsetY = e.clientY - startY;
     updatePanZoom(offsetX, offsetY, zoom, 0, 0);
 });

 document.addEventListener("mouseup", function (e) {
     panning = false;
 });

 document.addEventListener("touchstart", function (e) {
     if (e.touches.length != 1) return;
     var t = e.touches[0];
     if (t.force != 0) return;
     if (t.target.tagName == "INPUT") return;
     var target = t.target.closest(".box"); //Are we dealing with a box?
     if (target !== null) return;
     startX = t.clientX - offsetX;
     startY = t.clientY - offsetY;
     panning = true;
     //e.preventDefault();
 });

 document.addEventListener("touchmove", function (e) {
     if (!panning) return;
     if (e.touches.length > 1) {
         panning = false;
         return;
     }
     var t = e.touches[0];
     if (t.force != 0) return;
     offsetX = t.clientX - startX;
     offsetY = t.clientY - startY;
     updatePanZoom(offsetX, offsetY, zoom, 0, 0);
     e.preventDefault();
 });

 document.addEventListener("touchend", function (e) {
     if (!panning) return;
     panning = false;
     e.preventDefault();
 });

 function updatePanZoom(offsetX, offsetY, scale) {
     if (ruleInserted > -1) { //Check if we already have inserted a new rule
         sheet.removeRule(ruleInserted);
     }
     //Insert new rule at the end of the stylesheet
     var rule = "#content {transform: translateX(" + offsetX + "px) translateY(" + offsetY + "px) scale(" + scale + ");}";
     ruleInserted = document.styleSheets[0].rules.length;
     sheet.insertRule(rule, ruleInserted);
     var event = new CustomEvent("viewupdate");
     document.dispatchEvent(event);
 }

 ////// Drawing ///////
 var path = null;
 var points = [];
 var strokeWidth = 3;

 function generatePath(points) {
     var newPoints = [];
     newPoints.push(points[0]);

     for (var j = 1; j < points.length - 1; j++) {
         var p1 = points[j - 1];
         var p = points[j];
         var p2 = points[j + 1];
         var c = {
             x: p2.x - p1.x,
             y: p2.y - p1.y
         };
         var n = {
             x: -c.y,
             y: c.x
         };
         var len = Math.sqrt(n.x * n.x + n.y * n.y);
         if (len == 0) continue;
         var u = {
             x: n.x / len,
             y: n.y / len
         };

         newPoints.push({
             x: p.x + u.x * p.force * strokeWidth / zoom,
             y: p.y + u.y * p.force * strokeWidth / zoom
         });
     }
     newPoints.push(points[points.length - 1]);

     for (var j = points.length - 2; j > 0; j--) {
         var p1 = points[j + 1];
         var p = points[j];
         var p2 = points[j - 1];
         var c = {
             x: p2.x - p1.x,
             y: p2.y - p1.y
         };
         var n = {
             x: -c.y,
             y: c.x
         };
         var len = Math.sqrt(n.x * n.x + n.y * n.y);
         if (len == 0) continue;
         var u = {
             x: n.x / len,
             y: n.y / len
         };

         newPoints.push({
             x: p.x + u.x * p.force * strokeWidth / zoom,
             y: p.y + u.y * p.force * strokeWidth / zoom
         });
     }
     var p1 = newPoints[0];
     var p2 = newPoints[1];
     var pathString = "M" + p1.x + " " + p1.y;
     for (var j = 1; j < newPoints.length; j++) {
         var midPoint = midPointBtw(p1, p2);
         if (isNaN(p1.x) || isNaN(p1.y) || isNaN(midPoint.x) || isNaN(midPoint.y)) {
             console.log("NaN");
         }
         pathString = pathString += " Q " + p1.x + " " + p1.y + " " + midPoint.x + " " + midPoint.y;
         p1 = newPoints[j];
         p2 = newPoints[j + 1];
     }

     return pathString;
 }

 var showingColors = false;
 document.addEventListener("touchstart", function (e) {
     if (e.target.tagName == "INPUT") return;
     if (e.target.classList.contains("color")) return;
     if (e.touches.length != 1) return;
     var touch = e.touches[0];
     if (touch.force == 0) return;
     // Show color selectors on first touch with the pen
     if (!showingColors) {
         var rule = ".color {display: inline-block !important;}";
         sheet.insertRule(rule, document.styleSheets[0].rules.length);
         showingColors = true;
         return;
     }
     var ns = "http://www.w3.org/2000/svg";
     path = document.createElementNS(ns, "path");
     console.log(touch.clientX, offsetX);
     var x = (touch.clientX - offsetX) / zoom;
     var y = (touch.clientY - offsetY) / zoom;
     var point = {
         x: x,
         y: y,
         force: touch.force
     };
     points = [point];
     path.setAttribute("d", generatePath(points));
     path.setAttribute("fill", document.querySelector(color).style.backgroundColor);
     document.querySelector("svg").appendChild(path);
     e.preventDefault();
 });

 document.addEventListener("touchmove", function (e) {
     if (e.target.tagName == "INPUT") return;
     if (e.target.classList.contains("color")) return;
     if (e.touches.length != 1) return;
     var touch = e.touches[0];
     if (touch.force == 0) return;
     var x = (touch.clientX - offsetX) / zoom;
     var y = (touch.clientY - offsetY) / zoom;
     var point = {
         x: x,
         y: y,
         force: touch.force
     };
     points.push(point);
     var pathString = path.getAttribute("d");
     path.setAttribute("d", generatePath(points));
 });

 ////// TEXT HANDLING ///////

 function generateBoxId() {
     var boxes = document.querySelectorAll(".box");
     var maxId = 0;
     for (var i = 0; i < boxes.length; i++) {
         if (!boxes[i].hasAttribute("id")) continue;
         var boxId = Number(boxes[i].getAttribute("id").split("box")[1]);
         if (boxId > maxId) {
             maxId = boxId;
         }
     }
     return "box" + (maxId + 1);
 }


 function editBox(box) {
     edited = box;
     var md = box.querySelector(".markdown");
     if (md == null) {
         edited = null;
         return;
     }
     var rt = box.querySelector(".renderedText");
     md.style.display = "block";
     rt.style.display = "none";
     md.focus();
 }

 //Add new textbox on double-click on empty area, edit a box if it is double-clicked
 document.addEventListener("dblclick", function (e) {
     var box = e.target.closest(".box"); //Find the nearest box
     if (box) { //If its there make it editable
         editBox(box);
     } else { //Create a new box and focus it
         var box = document.createElement("div");
         var renderedText = document.createElement("div");
         var markdown = document.createElement("div");
         markdown.setAttribute("class", "markdown");
         renderedText.setAttribute("class", "renderedText");
         renderedText.style.display = "none";
         markdown.setAttribute("contentEditable", true);
         box.appendChild(renderedText);
         box.appendChild(markdown);
         box.setAttribute("class", "box");
         var boxId = generateBoxId();
         box.setAttribute("id", boxId);
         markdown.setAttribute("data-boxid", boxId);
         var left = (e.clientX - offsetX) / zoom;
         var top = (e.clientY - offsetY) / zoom;
         var fontsize = (1 / zoom) * 100;
         box.setAttribute("style", "left: " + left + "px; top:" + top + "px; font-size:" + fontsize + "%;");
         document.querySelector("#content").appendChild(box);
         markdown.focus();
         edited = box;
     }
 });

 /*document.addEventListener("touchstart", function(e) {
 	if (e.touches.length != 1) return;
   	var t = e.touches[0];
   	if (t.force != 0) return;
   	if (t.target.tagName == "INPUT") return;
   	var target = t.target.closest(".box"); //Are we dealing with a box?
   	if (selected !== target) return;
   	editBox(target);
 });*/

 function getTextContent(node) {
     if (node.tagName === "BR") return "\n";
     if (node.nodeType == 3) {
         return node.textContent;
     }
     var textContent = "";
     for (var i = 0; i < node.childNodes.length; i++) {
         textContent = textContent + getTextContent(node.childNodes[i]);
     }
     if (node.tagName === "DIV") {
         textContent = textContent + "\n";
     }
     return textContent;
 }

 //On click remove empty boxes and disable editing
 document.addEventListener("click", function (e) {
     document.querySelectorAll(".box").forEach(function (v,i) {
         if (v.querySelector(".markdown") == null) return;
         if (getTextContent(v.querySelector(".markdown")).trim().length == 0) {
             v.parentElement.removeChild(v);
         }
     });
     if (!edited || e.target.closest(".box") === edited) return;
     edited.setAttribute("contenteditable", false);
     var md = edited.querySelector(".markdown");
     var rt = edited.querySelector(".renderedText");
     rt.innerHTML = marked(getTextContent(md));
     md.style.display = "none";
     rt.style.display = "block";
     edited = null;
 });

 //Dragging of boxes
 function updateZ(target) {
     var boxes = document.querySelectorAll(".box");
     var currentZ = Number(target.style.zIndex);
     var maxZ = 1;
     for (var i = 0; i < boxes.length; i++) {
         var maxZ = Number(boxes[i].style.zIndex) > maxZ ? Number(boxes[i].style.zIndex) : maxZ;
     }
     if (currentZ < maxZ) {
         target.style.zIndex = maxZ + 1;
     }
 }
 document.addEventListener("mousedown", function (e) {
     var sizer = e.target.closest(".sizer");
     if (sizer !== null) return;
     var target = e.target.closest(".box");
     if (target === null) return;
     if (edited) return; //If we are editing we don't want to be able to drag things around
     dragged = target;
     var style = getComputedStyle(dragged);
     //We scale the mouse value based on the zoom level
     dragOffset.x = (e.clientX / zoom) - offsetX - parseInt(style.getPropertyValue("left"));
     dragOffset.y = (e.clientY / zoom) - offsetY - parseInt(style.getPropertyValue("top"));
     updateZ(target);
 });

 document.addEventListener("touchstart", function (e) {
     if (e.touches.length != 1) return;
     var t = e.touches[0];
     if (t.force != 0) return;
     var target = t.target.closest(".box"); //Are we dealing with a box?
     if (t.target.tagName == "input") return;
     if (target === null) return;
     if (edited) return;
     dragged = target;
     selected = target;
     var style = getComputedStyle(dragged);
     //We scale the mouse value based on the zoom level
     dragOffset.x = (t.clientX / zoom) - offsetX - parseInt(style.getPropertyValue("left"));
     dragOffset.y = (t.clientY / zoom) - offsetY - parseInt(style.getPropertyValue("top"));
     updateZ(target);
     //e.preventDefault();
 });

 document.addEventListener("mousemove", function (e) {
     if (dragged === null) return;
     if (edited) return;
     //Scale mouse value based on zoom level
     var left = (e.clientX / zoom) - offsetX - dragOffset.x;
     var top = (e.clientY / zoom) - offsetY - dragOffset.y;
     dragged.style.left = left + "px";
     dragged.style.top = top + "px";
     //dragged.setAttribute("style", "left: "+left+"px; top:"+top+"px;");
 });

 document.addEventListener("touchmove", function (e) {
     if (dragged === null) return;
     if (edited) return;
     if (e.touches.length != 1) {
         dragged = null;
         dragOffset = {
             x: 0,
             y: 0
         };
         return;
     }
     var t = e.touches[0];
     if (t.force != 0) return;
     var left = (t.clientX / zoom) - offsetX - dragOffset.x;
     var top = (t.clientY / zoom) - offsetY - dragOffset.y;
     dragged.style.left = left + "px";
     dragged.style.top = top + "px";
     e.preventDefault();
 });

 document.addEventListener("mouseup", function (e) {
     dragged = null;
     dragOffset = {
         x: 0,
         y: 0
     };
 });

 document.addEventListener("touchend", function (e) {
     if (dragged == null) return;
     dragged = null;
     dragOffset = {
         x: 0,
         y: 0
     };
     e.preventDefault();
 });

 ///// Resizing of boxes with mouse /////
 document.addEventListener("mousedown", function (e) {
     var sizer = e.target.closest(".sizer");
     if (sizer === null) return;
     var target = e.target.closest(".resizable");
     if (target === null) return;
     resizing = target;
     var rule = ".overlay {display: block !important;}";
     sheet.insertRule(rule, document.styleSheets[0].rules.length);
 });

 document.addEventListener("mousemove", function (e) {
     if (!resizing) return;
     var bounds = resizing.getBoundingClientRect();
     var w0 = bounds.width;
     var h0 = bounds.height;
     var w1 = Math.max(1, e.clientX / zoom - offsetX - bounds.left);
     var h1 = Math.max(1, e.clientY / zoom - offsetY - bounds.top);
     var wr = w1 / w0;
     var hr = h1 / h0;
     var ratio = wr < hr ? wr : hr;
     var newWidth = bounds.width * ratio;
     var newHeight = bounds.height * ratio;
     resizing.style.width = newWidth + "px";
     resizing.style.height = newHeight + "px";
 });

 document.addEventListener("mouseup", function (e) {
     if (!resizing) return;
     resizing = null;
     sheet.removeRule(document.styleSheets[0].rules.length - 1);

 });



 function computeZoomOffset(oldZoom, newZoom, mx, my) {
     var ix = (mx - offsetX) / oldZoom;
     var iy = (my - offsetY) / oldZoom;
     var nx = ix * newZoom;
     var ny = iy * newZoom;
     var cx = (ix + (mx - ix) - nx);
     var cy = (iy + (my - iy) - ny);
     offsetX = cx;
     offsetY = cy;
     return {
         x: cx,
         y: cy
     };
 }

 ///// ZOOMING //////
 document.addEventListener("mousewheel", function (e) {
     //Translate, scale, translate computed in the offset
     var oldZoom = zoom;
     var newZoom = Math.max(0.01, zoom - (e.deltaY / (1000 / zoom)));
     var mx = e.clientX;
     var my = e.clientY;
     var offset = computeZoomOffset(oldZoom, newZoom, mx, my);
     zoom = newZoom;
     updatePanZoom(offset.x, offset.y, newZoom);
     e.preventDefault();
     e.stopPropagation();
 });

 var initialZoom = 1.0;
 document.addEventListener("gesturestart", function (e) {
     console.log("ZOOM");
     var box = e.target.closest(".box");
     console.log(e.target, box);
     if (box !== null) return;
     console.log("ZOOOOM");
     initialZoom = zoom;
     e.preventDefault();
     e.stopPropagation();
 });

 document.addEventListener("gesturechange", function (e) {
     var box = e.target.closest(".box");
     if (box !== null) return;
     var oldZoom = zoom;
     var newZoom = initialZoom * e.scale;
     var mx = e.pageX;
     var my = e.pageY;
     var offset = computeZoomOffset(oldZoom, newZoom, mx, my);
     zoom = newZoom;
     updatePanZoom(offset.x, offset.y, zoom);
     e.preventDefault();
     e.stopPropagation();
 });

 document.addEventListener("gestureend", function (e) {
     var box = e.target.closest(".box");
     if (box !== null) return;
     e.preventDefault();
     e.stopPropagation();
 });

 //// SCALE BOXES ////
 var initialBoxScale = 1;
 document.addEventListener("gesturestart", function (e) {
     console.log("SCALE");
     var box = e.target.closest(".box");
     console.log(box);
     if (box == null) return;
     initialBoxScale = box.getBoundingClientRect().width / e.target.offsetWidth;
     e.preventDefault();
 });

 document.addEventListener("gesturechange", function (e) {
     var box = e.target.closest(".box");
     if (box == null) return;
     box.style.transform = "scale(" + (initialBoxScale * e.scale) + ")";
     e.preventDefault();
 });

 document.addEventListener("gestureend", function (e) {
     var box = e.target.closest(".box");
     if (box == null) return;
     e.preventDefault();
 });


 //Middle mousebutton resets pan/zoom
 document.addEventListener("click", function (e) {
     if (e.button != 1) return;
     zoom = 1.0;
     offsetX = 0;
     offsetY = 0;
     updatePanZoom(0, 0, zoom);
 });

 document.addEventListener("keydown", function (e) {
     if (edited !== null) return;
     if (e.keyCode == 27) {
         offsetX = 0;
         offsetY = 0;
         zoom = 1.0;
         updatePanZoom(offsetX, offsetY, zoom);
     }
 });

 ///// HELPER FUNCTIONS //////
 function midPointBtw(pa, pb) {
     return {
         x: pa.x + (pb.x - pa.x) / 2,
         y: pa.y + (pb.y - pa.y) / 2
     };
 }

 //# sourceURL=main

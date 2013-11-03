//
//  main.js
//
//  A project template for using arbor.js
//



(function($){

  var Renderer = function(canvas){
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d");
    var particleSystem

    var that = {
      init:function(system){
        //
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        // save a reference to the particle system for use in the .redraw() loop
        particleSystem = system

        // inform the system of the screen dimensions so it can map coords for us.
        // if the canvas is ever resized, screenSize should be called again with
        // the new dimensions
        particleSystem.screenSize(canvas.width, canvas.height) 
        particleSystem.screenPadding(80) // leave an extra 80px of whitespace per side
        
        // set up some event handlers to allow for node-dragging
        that.initMouseHandling()
      },
      
      redraw:function(){
        // 
        // redraw will be called repeatedly during the run whenever the node positions
        // change. the new positions for the nodes can be accessed by looking at the
        // .p attribute of a given node. however the p.x & p.y values are in the coordinates
        // of the particle system rather than the screen. you can either map them to
        // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
        // which allow you to step through the actual node objects but also pass an
        // x,y point in the screen's coordinate system
        // 
        ctx.fillStyle = "white"
        ctx.fillRect(0,0, canvas.width, canvas.height)
        
        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords

          // draw a line from pt1 to pt2
          ctx.strokeStyle = "rgba(0,0,0, .333)"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(pt2.x, pt2.y)
          ctx.stroke()
        })

        particleSystem.eachNode(function(node, pt){
         
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords
         
 
          // determine the box size and round off the coords if we'll be
          // drawing a text label (awful alignment jitter otherwise...)
          var w = ctx.measureText(node.data.label||"").width + 6
          var label = node.data.label
          if (!(label||"").match(/^[ \t]*$/)){
            pt.x = Math.floor(pt.x)
            pt.y = Math.floor(pt.y)
          }else{
            label = null
          }

          if(node.data.taken) {
              ctx.fillStyle = 'gray'
          } else if (node.data.canTake) {
              ctx.fillStyle = 'green'
          } else {
            ctx.fillStyle = 'red'
          }
 
          ctx.fillRect(pt.x - w/2, pt.y - 7, w,14)
 
          // draw the text
          if (label){
            ctx.font = "bold 11px Arial"
            ctx.textAlign = "center"
           
            // if (node.data.region) ctx.fillStyle = palette[node.data.region]
            // else ctx.fillStyle = "#888888"
            ctx.fillStyle = "#FFFFFF"            
 
            ctx.fillText(label||"", pt.x, pt.y+4)
          }
        })            
      },
      
     findNextClasses:function(node) {
          var outgoing = particleSystem.getEdgesFrom(node)
          var i = 0

          while (i < outgoing.length) {
              var nextNode = outgoing[i].target

              var prereqs = particleSystem.getEdgesTo(nextNode)
              var j = 0

              while (j < prereqs.length) {
                  if (!prereqs[j].source.data.taken) {
                      break
                  }
                  j++
              }

              if (j === prereqs.length) {
                  nextNode.data.canTake = true
              } else {
                  nextNode.data.canTake = false
              }
              console.log(outgoing)
              console.log(prereqs)
              console.log(nextNode.data.canTake)

              i++

          }
      },

      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;
        var dragging = false; // Tracks whether the node is being dragged

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            dragged = particleSystem.nearest(_mouseP);

            if (dragged && dragged.node !== null){
              // while we're dragging, don't let physics move the node
              dragged.node.fixed = true
            }

            oldTakenState = dragged.node.data.taken
            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            dragging = false // Node is no longer being dragged      

            return false
          },
          dragged:function(e, oldTakenState){
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (dragged && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }
 
            dragging = true // Node is being dragged          

            return false
          },

          dropped:function(e){
            if (!dragging){ // If node is not being dragged, then colors can possibly change
              var locked = false; // Whether or not the node is locked to color change based on dependencies
              var i = 0; // Loop counter

              if(!dragged.node.data.taken) { // If the current node is not taken yet
                var parents = particleSystem.getEdgesTo(dragged.node); // Get parents of node

                while(i < parents.length) { // Check if any of the parents are not taken
                   if(!parents[i].source.data.taken) {
                       locked = true;
                       break;
                   }

                   i++;
                }
              } else {
                var children = particleSystem.getEdgesFrom(dragged.node); // Get children of node

                while(i < children.length) { // Check if any of the children are taken
                    if(children[i].target.data.taken) {
                        locked = true;
                        break;
                    }

                    i++;
                }
              }

              if(!locked) { // If the node is not locked, change the color
                dragged.node.data.taken = !dragged.node.data.taken;
                that.findNextClasses(dragged.node);
              }
            }

            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            _mouseP = null
            return false
          }
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);

      },
      
    }
    return that
  }    

  $(document).ready(function(){
    var sys = arbor.ParticleSystem(0, 0, 0.5) // create the system with sensible repulsion/stiffness/friction
    sys.parameters({gravity:true}) // use center-gravity to make the graph settle nicely (ymmv)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...

    // add some nodes to the graph and watch it go...
    sys.addNode('cse1223', {label: "CSE 1223: Intro to Java", y: 0, x: 5, taken: false, canTake: false})

    sys.addNode('cse2221', {label: "CSE 2221: Software I", y: 1, x: 5, taken: false, canTake: false})

    sys.addNode('math1661', {label: "MATH 1161.01: Accel Calc I", y: 1, x: 6, taken: false, canTake: false})

    sys.addNode('phys1250', {label: "PHYS 1250: Physics 1", y: 2, x: 4, taken: false, canTake: false})

    sys.addNode('cse2321', {label: "CSE 2321: Foundations I", y: 2, x: 5, taken: false, canTake: false})

    sys.addNode('eng1181', {label: "ENG 1181: Fund Eng I", y: 2, x: 6, taken: false, canTake: false})

    sys.addNode('math2162', {label: "MATH 2162.01: Accel Calc II", y: 2, x: 7, taken: false, canTake: false})

    sys.addNode('ece2000', {label: "ECE 2000: ECE I", y: 3, x: 4, taken: false, canTake: false})

    sys.addNode('engl1110', {label: "ENGL 1100.XX: Writing I", y: 3, x: 5, taken: false, canTake: false})

    sys.addNode('cse2231', {label: "CSE 2231: Software II", y: 3, x: 6, taken: false, canTake: false})

    sys.addNode('eng1182', {label: "ENG 1182: Fund Eng II", y: 3, x: 7, taken: false, canTake: false})

    sys.addNode('stat4201', {label: "STAT 4201: Intro to Mathematical Statistics I", y: 3, x: 14, taken: false, canTake: false})

    sys.addNode('math2568', {label: "MATH 2568: Linear Algebra", y: 3, x: 18, taken: false, canTake: false})

    sys.addNode('stat3470', {label: "STAT 3470: Prob & Stats", y: 3, x: 20, taken: false, canTake: false})

    sys.addNode('ece2100', {label: "ECE 2100: ECE II", y: 4, x: 4, taken: false, canTake: false})

    sys.addNode('engl2367', {label: "ENGL 2367: Writing II", y: 4, x: 5, taken: false, canTake: false})

    sys.addNode('cse2421', {label: "CSE 2421: Systems I", y: 4, x: 6, taken: false, canTake: false})

    sys.addNode('cse2451', {label: "CSE 2451: Advanced C", y: 4, x: 7, taken: false, canTake: false})

    sys.addNode('cse2331', {label: "CSE 2331: Foundations II", y: 4, x: 8, taken: false, canTake: false})

    sys.addNode('cse4254', {label: "CSE 4254: Lisp", y: 4, x: 9, taken: false, canTake: false})

    sys.addNode('cse4251', {label: "CSE 4251: UNIX", y: 4, x: 10, taken: false, canTake: false})

    sys.addNode('cse4253', {label: "CSE 4253: C#", y: 4, x: 12, taken: false, canTake: false})

    sys.addNode('cse4252', {label: "CSE 4252: C++", y: 4, x: 13, taken: false, canTake: false})

    sys.addNode('cse4471', {label: "CSE 4471: Information Security", y: 4, x: 14, taken: false, canTake: false})

    sys.addNode('cse5361', {label: "CSE 5361: Numerical Methods", y: 4, x: 15, taken: false, canTake: false})

    sys.addNode('cse5543', {label: "CSE 5543: Geometric Modeling", y: 4, x: 16, taken: false, canTake: false})

    sys.addNode('cse2501', {label: "CSE 2501: Prof. Ethics", y: 5, x: 2, taken: false, canTake: false})

    sys.addNode('cse3421', {label: "CSE 3421: Systems - Architecture", y: 5, x: 5, taken: false, canTake: false})

    sys.addNode('cse3321', {label: "CSE 3321: Formal Langs", y: 5, x: 6, taken: false, canTake: false})

    sys.addNode('cse390x', {label: "CSE 390X: Project", y: 5, x: 7, taken: false, canTake: false})

    sys.addNode('cse3521', {label: "CSE 3521: Applications - AI", y: 5, x: 8, taken: false, canTake: false})

    sys.addNode('cse2431', {label: "CSE 2431: Systems II", y: 5, x: 9, taken: false, canTake: false})

    sys.addNode('cse5432', {label: "CSE 5432: Mobile Handsets & Networking", y: 5, x: 10, taken: false, canTake: false})

    sys.addNode('cse5245', {label: "CSE 5245: Intro to Network Science", y: 5, x: 11, taken: false, canTake: false})

    sys.addNode('cse5524', {label: "CSE 5524: Computer Vision for Human-Computer Interaction", y: 5, x: 12, taken: false, canTake: false})

    sys.addNode('cse4255', {label: "CSE 4255: Perl", y: 5, x: 13, taken: false, canTake: false})

    sys.addNode('cse5441', {label: "CSE 5441: Intro to Parallel Computing", y: 5, x: 14, taken: false, canTake: false})

    sys.addNode('cse5544', {label: "CSE 5544: Scientific Visualization", y: 5, x: 15, taken: false, canTake: false})

    sys.addNode('math3345', {label: "MATH 3345: Fnds of Higher Math", y: 5, x: 20, taken: false, canTake: false})

    sys.addNode('cse5914', {label: "CSE 5914: Knowledge-based Systems", y: 6, x: 2, taken: false, canTake: false})

    sys.addNode('cse3241', {label: "CSE 3241: Databases", y: 6, x: 3, taken: false, canTake: false})

    sys.addNode('cse3231', {label: "CSE 3231: Software Eng", y: 6, x: 4, taken: false, canTake: false})

    sys.addNode('cse3461', {label: "CSE 3461: Systems - Networking", y: 6, x:5, taken: false, canTake: false})

    sys.addNode('cse3341', {label: "CSE 3341: Prog. Langs", y: 6, x: 6, taken: false, canTake: false})

    sys.addNode('cse3541', {label: "CSE 3541: Applications - Graphics", y: 6, x: 8, taken: false, canTake: false})

    sys.addNode('cse5236', {label: "CSE 5236: Mobile Dev", y: 6, x: 10, taken: false, canTake: false})

    sys.addNode('cse5234', {label: "CSE 5234: Distributed Computing", y: 6, x: 11, taken: false, canTake: false})

    sys.addNode('cse5526', {label: "CSE 5526: Neural Networks", y: 6, x: 12, taken: false, canTake: false})

    sys.addNode('cse5522', {label: "CSE 5522: AI II - Advanced Techniques", y: 6, x: 13, taken: false, canTake: false})

    sys.addNode('cse5434', {label: "CSE 5434: Comparative Operating Systems", y: 6, x: 14, taken: false, canTake: false})

    sys.addNode('cse5234', {label: "CSE 5234: Distributed Enterprise Computing", y: 6, x: 15, taken: false, canTake: false})

    sys.addNode('cse5433', {label: "CSE 5433: Operating Systems Lab", y: 6, x: 16, taken: false, canTake: false})

    sys.addNode('cse5523', {label: "CSE 5523: Machine Learning", y: 6, x: 17, taken: false, canTake: false})

    sys.addNode('cse5542', {label: "CSE 5542: Real-Time Rendering", y: 6, x: 18, taken: false, canTake: false})

    sys.addNode('cse5341', {label: "CSE 5341: Principles of Languages", y: 6, x: 19, taken: false, canTake: false})

    sys.addNode('cse5525', {label: "CSE 5525: Fndns of Speech Processing", y: 6, x: 20, taken: false, canTake: false})

    sys.addNode('math4580', {label: "MATH 4580: Abstract Algebra I", y: 6, x: 21, taken: false, canTake: false})

    sys.addNode('cse5915', {label: "CSE 5915: Information Systems", y: 7, x: 0, taken: false, canTake: false})

    sys.addNode('cse5911', {label: "CSE 5911: Software Apps", y: 7, x: 1, taken: false, canTake: false})

    sys.addNode('cse5913', {label: "CSE 5913: Game Design & Dev", y: 7, x: 2, taken: false, canTake: false})

    sys.addNode('cse5913', {label: "CSE 5913: Animation", y: 7, x: 3, taken: false, canTake: false})

    sys.addNode('cse5242', {label: "CSE 5242: Advanced Database Management Systems", y: 7, x: 10, taken: false, canTake: false})

    sys.addNode('cse5473', {label: "CSE 5473: Network Security", y: 7, x: 11, taken: false, canTake: false})

    sys.addNode('cse5463', {label: "CSE 5463: Wireless Networking", y: 7, x: 12, taken: false, canTake: false})

    sys.addNode('cse5462', {label: "CSE 5462: Network Programming", y: 7, x: 13, taken: false, canTake: false})

    sys.addNode('cse3232', {label: "CSE 3232: Software Reqmts Analysis", y: 7, x: 14, taken: false, canTake: false})

    sys.addNode('cse5545', {label: "CSE 5545: Advanced Computer Graphics", y: 7, x: 15, taken: false, canTake: false})

    sys.addNode('cse5472', {label: "CSE 5472: Information Security Projects", y: 7, x: 16, taken: false, canTake: false})

    sys.addNode('cse5343', {label: "CSE 5343: Compiler Design & Implementation", y: 7, x: 17, taken: false, canTake: false})

    sys.addNode('cse5345', {label: "CSE 5345: Compilers", y: 7, x: 18, taken: false, canTake: false})

    sys.addNode('cse5243', {label: "CSE 5243: Intro to Data Mining", y: 7, x: 19, taken: false, canTake: false})

    sys.addNode('cse5351', {label: "CSE 5351: Cryptography", y: 7, x: 21, taken: false, canTake: false})


  sys.graft({
      nodes:{}, 
      edges:{
        cse1223:{ cse2221:{}},
        math161:{cse2321:{}, math2162:{}},
        math2162:{ece2000:{}},
        cse2221:{cse2231:{}, cse2321:{}, ece2000:{}},
        cse2231:{cse2331:{}, cse2421:{}, cse2501:{}, cse3241:{}, cse3341:{}, cse3421:{}, cse390x:{},cse4251:{}, cse4252:{}, cse4253:{},cse4255:{},cse4254:{}, cse5361:{},cse5441:{}, cse5471:{}},
        cse2321:{cse2331:{},cse2421:{}, cse2501:{}, cse3241:{}, cse390x:{}, cse5441:{}, cse5471:{}},
        cse2331:{cse2431:{}},
        cse2421:{cse2431:{}},
        phys1250:{ece2000:{}},
        ece2000:{ece2100:{}, cse3421:{}},
        engl2367:{cse2501:{}},
        engl1110:{engl2367:{}},
        cse2501:{cse5915:{}, cse5911:{}, cse5913:{}, cse5914:{}, cse5912:{}},
        engr1181:{engr1182:{}},
}

    })


    // or, equivalently:
    //
    // sys.graft({
    //   nodes:{
    //     f:{alone:true, mass:.25}
    //   }, 
    //   edges:{
    //     a:{ b:{},
    //         c:{},
    //         d:{},
    //         e:{}
    //     }
    //   }
    // })
    
  })

})(this.jQuery)


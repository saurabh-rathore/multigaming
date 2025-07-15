const canvas = document.getElementById('game-canvas');
const socket = io();
const { Engine, Render, World, Bodies, Body, Events, Mouse, MouseConstraint } = Matter;

const engine = Engine.create();
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: 800,
        height: 400,
        wireframes: false,
        background: 'green'
    }
});

const walls = [
    Bodies.rectangle(400, 0, 800, 20, { isStatic: true }),
    Bodies.rectangle(400, 400, 800, 20, { isStatic: true }),
    Bodies.rectangle(0, 200, 20, 400, { isStatic: true }),
    Bodies.rectangle(800, 200, 20, 400, { isStatic: true })
];
World.add(engine.world, walls);

const balls = [];
const ballColors = [
    'white', 'yellow', 'blue', 'red', 'purple', 'orange', 'green', 'brown',
    'black', 'yellow', 'blue', 'red', 'purple', 'orange', 'green', 'brown'
];
for (let i = 0; i < 16; i++) {
    const isCueBall = i === 0;
    const x = isCueBall ? 200 : 600 + (i % 4) * 25;
    const y = isCueBall ? 200 : 150 + Math.floor(i / 4) * 25;
    const ball = Bodies.circle(x, y, 10, {
        restitution: 0.8,
        friction: 0.1,
        render: {
            fillStyle: ballColors[i]
        }
    });
    balls.push(ball);
}
World.add(engine.world, balls);

const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: false
        }
    }
});
World.add(engine.world, mouseConstraint);

Events.on(mouseConstraint, 'enddrag', (event) => {
    if (event.body.render.fillStyle === 'white') {
        const force = Matter.Vector.sub(event.mouse.position, event.body.position);
        socket.emit('shoot', { ballIndex: 0, force: { x: force.x * 0.01, y: force.y * 0.01 } });
    }
});

socket.on('game-state', (ballPositions) => {
    for (let i = 0; i < ballPositions.length; i++) {
        Body.setPosition(balls[i], ballPositions[i]);
    }
});

Engine.run(engine);
Render.run(render);

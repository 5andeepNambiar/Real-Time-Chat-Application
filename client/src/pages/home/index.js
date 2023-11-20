import styles from './styles.module.css';
import { useNavigate } from 'react-router-dom';

const Home = ({ username, setUsername, room, setRoom, socket }) => {
  const navigate = useNavigate(); 

  const joinRoom = () => {
    if (room !== '' && username !== '') {
      socket.emit('join_room', { username, room });
      navigate('/chat', { replace: true });
    }

    else
    {
      alert('Please enter both username and room number.');
    }
    
  };

  return (
    <div className={styles.box}>
      <div className={styles.box}>
        <h2>{`<>CHATROOM</>`}</h2>
        <input
          type = "text"
          placeholder='Username...'
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type = "text"
          placeholder='Room Number...'
          onChange={(e) => setRoom(e.target.value)}
        />

    <button className={styles.button} onClick={joinRoom}>
          <span>Join Room</span><i></i>
        </button>
      </div>
    </div>
  );
};

export default Home;


import React from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import FormControl from 'react-bootstrap/FormControl';
import {
    getAuth,
} from "firebase/auth";
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    where,
    limit,
    getDoc,
    getDocs,
    onSnapshot,
    getCountFromServer,
    query,
    orderBy,
    getFirestore,
    startAfter,
    documentId,
} from "firebase/firestore";
import BaseApp from '../../baseapp';

export default function DialogPublishEmbedding(props) {
    const [show, setShow] = React.useState(false);
    const [sessions, setSessions] = React.useState([]);

    props.setShow = setShow;
    props.setSessions = setSessions;

    const handleClose = () => setShow(false);

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton className="theme_panel">
                <Modal.Title>Publish Embedding</Modal.Title>
            </Modal.Header>
            <Modal.Body className="theme_panel">
                <h4>Connected Sessions</h4>
                <div class="connected_sessions_list">
                    {sessions.map((doc) => (
                        <a className="connected_session_row" target="_blank"
                            href={`/session/${doc.id}`}>{doc.data().title} |
                            {BaseApp.showGmailStyleDate(new Date(doc.data().lastActivity))} |
                            {doc.id}
                        </a>
                    ))}
                </div>
                <br />
                <button class="btn btn-primary" onClick={() => props.addConnectedSession()}>Create Connected Session</button>
            </Modal.Body>
            <Modal.Footer className="theme_panel">
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
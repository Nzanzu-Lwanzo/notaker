import Alpine from "alpinejs";
import { Connection, DATA_TYPE } from "jsstore";
import WorkerInjector from "jsstore/dist/worker_injector";

const labelInput = document.querySelector("[name='label']");
const contentInput = document.querySelector("[name='content']");

// JSSTORE STUFF
const connection = new Connection();
connection.addPlugin(WorkerInjector);
connection.initDb({
  name: "notaker",
  tables: [
    {
      name: "notes",
      columns: {
        id: {
          primaryKey: true,
          autoIncrement: true,
          notNull: true,
          dataType: DATA_TYPE.Number,
        },

        label: {
          notNull: true,
          dataType: DATA_TYPE.String,
        },

        content: {
          notNull: false,
          dataType: DATA_TYPE.String,
        },

        createDate: {
          notNull: true,
          dataType: DATA_TYPE.DateTime,
        },
      },
    },
  ],
});

// ALPINE STUFF
window.Alpine = Alpine;

document.addEventListener("alpine:init", function () {
  Alpine.data("globalStore", () => ({
    notes: [],
    note: {
      id: 0,
      label: "No label for now",
      content: "No content for now",
      createDate: new Date(),
    },
    createFormVisible: false,
    updateFormVisible: false,
    async init() {
      const notes = await connection.select({
        from: "notes",
      });

      this.notes = notes;
    },
    setNote(note) {
      this.note = note;
    },

    async deleteNote() {
      let id = this.note.id;

      await connection.remove({
        from: "notes",
        where: {
          id: parseInt(this.note.id),
        },
      });

      this.note = { id: 0 };
      this.notes = this.notes.filter((note) => note.id !== id);
    },

    async deleteAllNotes() {
      await connection.remove({
        from: "notes",
      });

      this.notes = [];
      this.note = { id: 0 };
    },
  }));

  Alpine.data("formData", () => ({
    label: "",
    content: "",
    handleSubmit: async function (event) {
      let is_update = this.$data.note.id !== 0;

      const formData = new FormData(event.currentTarget);
      const note = {
        ...Object.fromEntries(formData),
        createDate: new Date(),
      };

      // If there's an id superior to 0,
      // this is an update. We keep the id
      // and we simply do an upsert
      if (is_update) {
        note.id = this.$data.note.id;
      }

      // Save to database
      const createdNotes = await connection.insert({
        into: "notes",
        values: [note],
        return: true,
        upsert: true,
      });

      if (is_update) {
        // Replace the old note object in the state array
        const notes = this.$data.notes;
        let id = notes.findIndex((note) => note.id == createdNotes[0].id);
        if (id !== -1) {
          notes.splice(id, 1, createdNotes[0]);
        }
        this.$data.notes = notes;
      } else {
        // Save this in the state that contains all the notes
        this.$data.notes.push(createdNotes[0]);
      }

      this.$data.note = createdNotes[0];
      this.$data.createFormVisible = false;
      this.$data.updateFormVisible = false;

      // Reset the form
      labelInput.value = "";
      contentInput.value = "";
    },
  }));
});

Alpine.start();

export default connection;

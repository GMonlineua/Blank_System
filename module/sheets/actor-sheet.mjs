import { createRollDialog } from "../helpers/roll.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class BlankActorSheet extends ActorSheet
{

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["blank", "sheet", "actor"],
      template: "systems/blank/templates/character-sheet.hbs",
      width: 600,
      height: 700
    });
  }

  /** @override */
  get template() {
    return `systems/blank/templates/${this.actor.type}-sheet.hbs`;
  }

  /** @override */
  async getData() {
    const context = await super.getData();
    const actorData = this.actor.toObject(false);

    // Encrich editor content
    context.enrichedNotes = await TextEditor.enrichHTML(this.object.system.notes, { async: true })
    context.enrichedDescription = await TextEditor.enrichHTML(this.object.system.description, { async: true })

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    this._prepareCharacterData(context);

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
    }

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
  }

    /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const item = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to loot.
      if (i.type === 'item') {
        item.push(i);
      }
    }

    // Assign and return
    context.item = item;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const button = ev.currentTarget;
      const li = button.closest(".item");
      const item = this.actor.items.get(li?.dataset.itemId);
      return item.delete();
    });

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Show item summary.
    html.find('.item-name').click(ev => {
      const button = ev.currentTarget;
      const li = button.closest(".item");
      const summary = li.getElementsByClassName("item-summary")[0];
      if (summary) {
        const contentHeight = summary.scrollHeight;
        summary.style.height = summary.classList.contains("active") ? "0" : `${contentHeight}px`;
        summary.classList.toggle("active");
      }
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /* -------------------------------------------- */

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    if (this.actor.isOwner) {
      buttons = [
        {
          label: "Roll",
          class: "quietus-roll",
          icon: "fas fa-dice",
          onclick: (ev) => createRollDialog(this.actor)
        }
      ].concat(buttons);
    }
    return buttons;
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */

  _onItemCreate(event)
  {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const data = duplicate(header.dataset);
    const name = game.i18n.localize("TYPES.Item.item");
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    const cls = getDocumentClass("Item");
    return cls.create(itemData, {parent: this.actor});    
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();

      } else if (dataset.rollType == 'show') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.show();

      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode')
      });
      return roll;
    }
  }
}

<div class="modal-footer">
  <slot />
</div>

<style>
  .modal-footer {
    align-items: center;
    background-color: var(--st-gray-20);
    border-radius: 0px 0px 4px 4px;
    color: var(--st-gray-100);
    display: flex;
    height: 40px;
    justify-content: flex-end;
    padding: 1rem;
    width: 100%;
  }

  .modal-footer > :global(.st-button) {
    margin-left: 5px;
    width: 80px;
  }

  .modal-footer > :global(.st-button.secondary) {
    border: 1px solid var(--st-gray-30);
  }
</style>
